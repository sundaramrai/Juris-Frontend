// src/app/components/register/register.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TldService } from '../../services/tld.service';

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
  validTlds: string[] = [];

  otpForm: FormGroup;
  isOtpSent = false;
  registrationEmail: string | null = null;

  usernameMinLength = 2;
  usernameMaxLength = 20;

  constructor(private fb: FormBuilder, private router: Router, private authService: AuthService, private tldService: TldService) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, this.enhancedEmailValidator.bind(this)], [this.existingEmailValidator.bind(this)]],
      username: ['', [Validators.required, Validators.minLength(this.usernameMinLength),Validators.maxLength(this.usernameMaxLength),
          this.enhancedUsernameValidator], [this.existingUsernameValidator]],
      password: ['', [Validators.required, this.enhancedPasswordValidator]],
    });
    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.router.navigate(['/tools']);
      }
    });

    this.tldService.getTlds().subscribe((tlds: string[]) => {
      this.validTlds = tlds.map(tld => tld.toLowerCase());
    });
  }

  enhancedUsernameValidator(control: AbstractControl): ValidationErrors | null {
    const username = control.value;
    if (!username) return null;

    const isNumeric = /^\d+$/.test(username);
    if (isNumeric) return { numericOnly: true };

    const alphabeticCount = (username.match(/[a-zA-Z]/g) || []).length;
    if (alphabeticCount < 2) return { insufficientLetters: true };

    if (username === '_') return { invalidFormat: true };

    const hasInvalidChars = /[^a-zA-Z0-9_]/.test(username);
    if (hasInvalidChars) return { invalidCharacters: true };

    return null;
  }

  existingUsernameValidator(control: AbstractControl): ValidationErrors | null {
    const username = control.value;
    if (!username) return null;

    const data = localStorage.getItem('registerData');
    const registeredUsers = JSON.parse(data || '[]');
    const exists = registeredUsers.some((user: any) => user.username === username);

    return exists ? { usernameExists: true } : null;
  }

  onUsernameInput(event: any) {
    const input = event.target;
    input.value = input.value.toLowerCase();
  }

  enhancedPasswordValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.value;
    if (!password) return null;

    const errors: ValidationErrors = {};
    const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d{2,})(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!pattern.test(password)) {
      errors['patternMismatch'] = true;
    }

    return Object.keys(errors).length ? errors : null;
  }

  enhancedEmailValidator = (control: AbstractControl): ValidationErrors | null => {
    const email = control.value;
    if (!email) return null;

    const errors: ValidationErrors = {};

    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(email)) {
      errors['invalidFormat'] = true;
      return errors;
    }
    const [local, domain] = email.split('@');
    if (!domain || domain.indexOf('.') === -1) {
      errors['invalidDomain'] = true;
    }
    const domainTld = domain.split('.').pop()?.toLowerCase();
    if (domainTld && !this.validTlds.includes(domainTld)) {
      errors['invalidTLD'] = true;
    }
    return Object.keys(errors).length ? errors : null;
  }


  existingEmailValidator(control: AbstractControl): ValidationErrors | null {
    const email = control.value;
    if (!email) return null;

    const data = localStorage.getItem('registerData');
    const registeredUsers = JSON.parse(data || '[]');
    const exists = registeredUsers.some((user: any) => user.email === email);

    return exists ? { emailExists: true } : null;
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onRegister() {
    if (this.registerForm.invalid) {
      Object.keys(this.registerForm.controls).forEach(key => {
        const control = this.registerForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

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
  }

  onLogin() {
    this.router.navigate(['/login']);
  }

  onRequestOTP() {
    if (this.registerForm.invalid) {
      Object.keys(this.registerForm.controls).forEach(key => {
        const control = this.registerForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const userData = this.registerForm.value;
    this.authService.requestOTP(userData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.isOtpSent = true;
        this.registrationEmail = userData.email;
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error.message || 'OTP request failed';
      }
    });
  }

  onVerifyOTP() {
    if (this.otpForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    if (!this.registrationEmail) {
      this.errorMessage = 'Email is required for OTP verification.';
      this.isLoading = false;
      return;
    }

    const otpData = {
      email: this.registrationEmail,
      otp: this.otpForm.get('otp')?.value as string
    };

    this.authService.verifyOTP(otpData).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error.message || 'OTP verification failed';
      }
    });
  }

  onOtpInput(event: Event): void {
    const input = (event.target as HTMLInputElement).value.replace(/\D/g, '');
    this.otpForm.get('otp')?.setValue(input);
  }

  onChangeEmail() {
    this.isOtpSent = false;
    this.registrationEmail = null;
    this.errorMessage = null;
  }
}
