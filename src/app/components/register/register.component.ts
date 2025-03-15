// src/app/components/register/register.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
// import { of, map, delay } from 'rxjs';

@Component({
  selector: 'app-register',
  standalone: false,
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent implements OnInit {
  isLoading = false;
  registerForm: FormGroup;
  errorMessage: string | null = null;
  showPassword = false;
  showConfirmPassword = false;

  constructor(private fb: FormBuilder, private router: Router, private authService: AuthService) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, this.localEmailValidator], [this.existingEmailValidator]],
      username: ['',[Validators.required, this.localUsernameValidator, this.existingUsernameValidator],],
      password: ['', [Validators.required, Validators.minLength(8), this.passwordValidator]],
      confirmPassword: ['', [Validators.required]],
    }, { validators: this.confirmPasswordValidator });

  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.router.navigate(['/register']);
      }
    });
    // const registeredUsers = JSON.parse(localStorage.getItem('registerData') || '[]');
    // console.log('Registered Users:', registeredUsers);
  }

  // Existing synchronous validation for username
  localUsernameValidator(control: AbstractControl): ValidationErrors | null {
    const username = control.value;

    if (!username) return null;

    const isNumeric = /^\d+$/.test(username);
    if (isNumeric) return { invalidUsername: true };

    const alphabeticCount = (username.match(/[a-zA-Z]/g) || []).length;
    if (alphabeticCount < 3) return { invalidUsername: true };

    if (username === '_') return { invalidUsername: true };

    const hasInvalidChars = /[^a-zA-Z0-9_]/.test(username);
    if (hasInvalidChars) return { invalidUsername: true };

    return null;
  }

  // This is used in the case when we want to check if username exists synchronously (without making HTTP requests)
  existingUsernameValidator(control: AbstractControl): ValidationErrors | null {
    const username = control.value;
    const data = localStorage.getItem('registerData');
    const registeredUsers = JSON.parse(data || '[]');
    const exists = registeredUsers.some((user: any) => user.username === username);

    return exists ? { usernameExists: true } : null;
  }

  onUsernameInput(event: any) {
    const input = event.target;
    input.value = input.value.toLowerCase();
  }

  passwordValidator(control: any) {
    const password = control.value;
    if (!password) {
      return null;
    }
    const numberCount = (password.match(/\d/g) || []).length;
    const upperCaseCount = (password.match(/[A-Z]/g) || []).length;
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const valid = numberCount >= 2 && upperCaseCount >= 2 && hasSpecialChar && hasLowerCase;
    if (!valid) {
      return { invalidPassword: true };
    }
    return null;
  }

  confirmPasswordValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.parent) return null; // Ensures the form is available

    const password = control.parent.get('password')?.value;
    const confirmPassword = control.value;

    if (!password || !confirmPassword) {
      return null; // Let the "required" validator handle empty fields
    }

    return password === confirmPassword ? null : { passwordMismatch: true };
  }


  localEmailValidator(control: AbstractControl): ValidationErrors | null {
    const email = control.value;
    if (!email) return null;
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(email)) return { invalidEmailFormat: true };
    const [local, domain] = email.split('@');
    if (domain && domain.indexOf('.') !== -1) return null;
    return { invalidEmailDomain: true };
  }

  existingEmailValidator(control: AbstractControl): ValidationErrors | null {
    const email = control.value;
    const data = localStorage.getItem('registerData');
    const registeredUsers = JSON.parse(data || '[]');
    const exists = registeredUsers.some((user: any) => user.email === email);
    return exists ? { emailExists: true } : null;
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onRegister() {
    if (this.registerForm.invalid) {
      return;
    }
    this.isLoading = true;
    this.errorMessage = null;
    // check if user already exists
    const userData = this.registerForm.value;
    this.authService.register(userData).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.isLoading = false;
        if (error.error.message.includes('username')) {
          this.errorMessage = 'Username already exists. Please choose a different username.';
        } else if (error.error.message.includes('email')) {
          this.errorMessage = 'Email already exists. Please choose a different email.';
        } else {
          this.errorMessage = error.error.message || 'Registration failed';
        }
      }
    });

    this.registerForm.reset();
    console.log('User registered');
  }

  onLogin() {
    this.router.navigate(['/login']);
  }
}
