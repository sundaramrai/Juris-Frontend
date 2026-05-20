import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TldService } from '../../services/tld.service';
import { MatIconModule } from '@angular/material/icon';
import { of } from 'rxjs';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  imports: [ReactiveFormsModule, MatIconModule]
})
export class RegisterComponent implements OnInit {
  isLoading = false;
  isSubmitting = false;
  registerForm: FormGroup;
  errorMessage: string | null = null;
  showPassword = false;
  validTlds: string[] = [];
  readonly usernameMinLength = 2;
  readonly usernameMaxLength = 20;
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly tldService = inject(TldService);
  private readonly router = inject(Router);

  constructor() {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, this.enhancedEmailValidator], [this.existingEmailValidator]],
      username: ['', [Validators.required, Validators.minLength(this.usernameMinLength), Validators.maxLength(this.usernameMaxLength), this.enhancedUsernameValidator], [this.existingUsernameValidator]],
      password: ['', [Validators.required, this.enhancedPasswordValidator]]
    });
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      if (user) this.router.navigate(['/assistant']);
    });

    this.tldService.getTlds().subscribe((tlds: string[]) => {
      this.validTlds = tlds.map(tld => tld.toLowerCase());
      this.registerForm.get('email')?.updateValueAndValidity();
    });
  }

  private readonly enhancedUsernameValidator = (control: AbstractControl): ValidationErrors | null => {
    const username = control.value;
    if (!username) return null;
    if (!/^\w+$/.test(username)) return { invalidCharacters: true };
    if ((username.match(/[a-zA-Z]/g) || []).length < 2) return { insufficientLetters: true };
    if (/^\d+$/.test(username)) return { numericOnly: true };
    if (/^_+$/.test(username)) return { invalidFormat: true };
    return null;
  };

  private readonly existingUsernameValidator = (control: AbstractControl) => {
    const username = control.value;
    if (!username) return of(null);
    const data = localStorage.getItem('registerData');
    const registeredUsers = JSON.parse(data || '[]');
    const exists = registeredUsers.some((user: any) => user.username === username);
    return of(exists ? { usernameExists: true } : null);
  };

  onUsernameInput() {
    const username = this.registerForm.get('username')?.value;
    if (username) {
      this.registerForm.get('username')?.patchValue(username.toLowerCase(), { emitEvent: false });
    }
  }

  private readonly enhancedPasswordValidator = (control: AbstractControl): ValidationErrors | null => {
    const password = control.value;
    if (!password) return null;
    const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d{2,})(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    return pattern.test(password) ? null : { patternMismatch: true };
  };

  private readonly enhancedEmailValidator = (control: AbstractControl): ValidationErrors | null => {
    const email = control.value;
    if (!email) return null;
    const errors: ValidationErrors = {};
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(email)) {
      errors['invalidFormat'] = true;
      return errors;
    }
    const [, domain] = email.split('@');
    if (!domain?.includes('.')) errors['invalidDomain'] = true;
    const domainTld = domain.split('.').pop()?.toLowerCase();
    if (domainTld && this.validTlds.length > 0 && !this.validTlds.includes(domainTld)) {
      errors['invalidTLD'] = true;
    }
    return Object.keys(errors).length ? errors : null;
  };

  private readonly existingEmailValidator = (control: AbstractControl) => {
    const email = control.value;
    if (!email) return of(null);
    const data = localStorage.getItem('registerData');
    const registeredUsers = JSON.parse(data || '[]');
    const exists = registeredUsers.some((user: any) => user.email === email);
    return of(exists ? { emailExists: true } : null);
  };

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  private markAllControlsTouched() {
    for (const control of Object.values(this.registerForm.controls)) {
      control.markAsTouched();
    }
  }

  onRegister() {
    if (this.isSubmitting) return;
    if (this.registerForm.invalid) {
      this.markAllControlsTouched();
      return;
    }
    this.isLoading = true;
    this.isSubmitting = true;
    this.errorMessage = null;

    this.authService.register(this.registerForm.value).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.isLoading = false;
        this.isSubmitting = false;
        const msg = error?.error?.message || '';
        if (msg.includes('username')) {
          this.errorMessage = 'Username already exists. Please choose a different username.';
        } else if (msg.includes('email')) {
          this.errorMessage = 'Email already exists. Please choose a different email.';
        } else {
          this.errorMessage = msg || 'Registration failed';
        }
      }
    });
  }

  onLogin() {
    this.router.navigate(['/login']);
  }
}
