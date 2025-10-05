import os
import secrets
from datetime import datetime
from flask import render_template, request, redirect, url_for, flash, jsonify, session, current_app
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app import app, db
from models import User, PrintRequest
import logging

# Allowed file extensions
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        # Validation
        if not all([username, email, password, confirm_password]):
            flash('All fields are required', 'error')
            return render_template('register.html')
        
        if password != confirm_password:
            flash('Passwords do not match', 'error')
            return render_template('register.html')
        
        if User.query.filter_by(email=email).first():
            flash('Email already registered', 'error')
            return render_template('register.html')
        
        if User.query.filter_by(username=username).first():
            flash('Username already taken', 'error')
            return render_template('register.html')
        
        # Create new user
        user = User(
            username=username,
            email=email,
            password_hash=generate_password_hash(password),
            role='student'  # All new registrations are students
        )
        
        db.session.add(user)
        db.session.commit()
        
        flash('Registration successful! You can now login.', 'success')
        return redirect(url_for('login'))
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        if not email or not password:
            flash('Email and password are required', 'error')
            return render_template('login.html')
        
        user = User.query.filter_by(email=email).first()
        
        if user and check_password_hash(user.password_hash, password):
            login_user(user)
            session['user_id'] = user.id
            session['user_role'] = user.role
            
            # Redirect based on role
            if user.role == 'admin':
                return redirect(url_for('admin_dashboard'))
            else:
                return redirect(url_for('upload'))
        else:
            flash('Invalid email or password', 'error')
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    session.clear()
    flash('You have been logged out', 'success')
    return redirect(url_for('index'))

@app.route('/upload', methods=['GET', 'POST'])
def upload():
    if request.method == 'POST':
        # Check if user is logged in for file upload
        if not current_user.is_authenticated:
            flash('Please login to submit print requests', 'error')
            return redirect(url_for('login'))
            
        # Handle file upload
        if 'file' not in request.files:
            flash('No file selected', 'error')
            return render_template('upload.html')
        
        file = request.files['file']
        if file.filename == '':
            flash('No file selected', 'error')
            return render_template('upload.html')
        
        if file and allowed_file(file.filename):
            # Generate secure filename
            filename = secure_filename(file.filename)
            unique_filename = f"{secrets.token_hex(8)}_{filename}"
            file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(file_path)
            
            # Get form data
            print_type = request.form.get('print_type', 'bw')
            copies = int(request.form.get('copies', 1))
            double_sided = request.form.get('double_sided') == 'on'
            binding = request.form.get('binding', '')
            notes = request.form.get('notes', '')
            pages = int(request.form.get('pages', 1))  # This would normally be calculated from the file
            
            # Calculate cost
            page_cost = 5 if print_type == 'bw' else 20  # ₹5 for B&W, ₹20 for color
            total_pages = pages * copies
            if double_sided:
                total_pages = (total_pages + 1) // 2  # Round up for odd pages
            total_cost = total_pages * page_cost
            
            # Create print request
            print_request = PrintRequest(
                user_id=current_user.id,
                filename=unique_filename,
                original_filename=filename,
                file_path=file_path,
                print_type=print_type,
                copies=copies,
                double_sided=double_sided,
                binding=binding,
                notes=notes,
                pages=pages,
                total_cost=total_cost
            )
            
            db.session.add(print_request)
            db.session.commit()
            
            flash(f'Print request submitted successfully! Total cost: ₹{total_cost}', 'success')
            return redirect(url_for('upload'))
        else:
            flash('Invalid file type. Please upload PDF, DOC, or DOCX files only.', 'error')
    
    # Get user's print requests if logged in
    requests = []
    if current_user.is_authenticated:
        requests = PrintRequest.query.filter_by(user_id=current_user.id).order_by(PrintRequest.created_at.desc()).all()
    return render_template('upload.html', requests=requests)

@app.route('/profile')
@login_required
def profile():
    # Get user's print requests
    requests = PrintRequest.query.filter_by(user_id=current_user.id).order_by(PrintRequest.created_at.desc()).all()
    
    # Calculate user statistics
    total_requests = len(requests)
    total_spent = sum(request.total_cost for request in requests)
    pending_count = len([r for r in requests if r.status == 'pending'])
    completed_count = len([r for r in requests if r.status == 'completed'])
    
    stats = {
        'total_requests': total_requests,
        'total_spent': total_spent,
        'pending': pending_count,
        'completed': completed_count
    }
    
    return render_template('profile.html', requests=requests, stats=stats)

@app.route('/admin')
@login_required
def admin_dashboard():
    if current_user.role != 'admin':
        flash('Access denied. Admin privileges required.', 'error')
        return redirect(url_for('upload'))
    
    # Get statistics
    total_requests = PrintRequest.query.count()
    pending_requests = PrintRequest.query.filter_by(status='pending').count()
    printing_requests = PrintRequest.query.filter_by(status='printing').count()
    completed_requests = PrintRequest.query.filter_by(status='completed').count()
    
    # Get all print requests
    all_requests = PrintRequest.query.order_by(PrintRequest.created_at.desc()).all()
    
    stats = {
        'total': total_requests,
        'pending': pending_requests,
        'printing': printing_requests,
        'completed': completed_requests
    }
    
    return render_template('admin.html', stats=stats, requests=all_requests)

@app.route('/api/calculate_price', methods=['POST'])
@login_required
def calculate_price():
    """API endpoint to calculate print price"""
    data = request.get_json()
    
    print_type = data.get('print_type', 'bw')
    copies = int(data.get('copies', 1))
    pages = int(data.get('pages', 1))
    double_sided = data.get('double_sided', False)
    
    # Calculate cost
    page_cost = 5 if print_type == 'bw' else 20
    total_pages = pages * copies
    if double_sided:
        total_pages = (total_pages + 1) // 2
    
    total_cost = total_pages * page_cost
    
    return jsonify({
        'total_pages': total_pages,
        'page_cost': page_cost,
        'total_cost': total_cost
    })

@app.route('/api/update_request_status', methods=['POST'])
@login_required
def update_request_status():
    """API endpoint for admin to update request status"""
    if current_user.role != 'admin':
        return jsonify({'error': 'Access denied'}), 403
    
    data = request.get_json()
    request_id = data.get('request_id')
    new_status = data.get('status')
    
    print_request = PrintRequest.query.get(request_id)
    if not print_request:
        return jsonify({'error': 'Request not found'}), 404
    
    print_request.status = new_status
    print_request.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({'success': True})

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return render_template('base.html'), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return render_template('base.html'), 500
