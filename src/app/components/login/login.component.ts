// src/app/components/login/login.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatTooltipModule]
})
export class LoginComponent implements OnInit {
  isLoading = false;
  isSubmitting = false;
  loginForm: FormGroup;
  errorMessage: string | null = null;
  showPassword = false;

  constructor(private fb: FormBuilder, private router: Router, private authService: AuthService) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      console.log("🔄 User already logged in, redirecting...");
      this.router.navigate(['/tools']);
    }
  }

  onUsernameInput() {
    const username = this.loginForm.get('username')?.value;
    if (username) {
      this.loginForm.get('username')?.patchValue(username.toLowerCase(), { emitEvent: false });
    }
  }
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  private markAllControlsTouched() {
    for (const control of Object.values(this.loginForm.controls)) {
      control.markAsTouched();
    }
  }

  onLogin() {
    if (this.isSubmitting) {
      return;
    }
    if (this.loginForm.invalid) {
      this.markAllControlsTouched();
      return;
    }

    this.isLoading = true;
    this.isSubmitting = true;
    this.errorMessage = null;

    const credentials = this.loginForm.value;

    this.authService.login(credentials).subscribe({
      next: (response) => {
        console.log("✅ Login successful:", response);
        localStorage.setItem('token', response.token);
        localStorage.setItem('loggedInUser', response.user.username);
        localStorage.setItem('loginTimestamp', Date.now().toString());

        this.isLoading = false;
        this.router.navigate(['/tools']);
      },
      error: (error) => {
        console.error("❌ Login failed:", error);
        this.isLoading = false;
        this.isSubmitting = false;
        this.errorMessage = error.error?.message || 'Login failed';
      }
    });

    this.loginForm.reset();
  }

  onRegister() {
    this.router.navigate(['/register']);
  }

  onHome() {
    this.router.navigate(['/home']);
  }
}
