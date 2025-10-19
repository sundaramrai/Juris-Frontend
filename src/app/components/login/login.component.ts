// src/app/components/login/login.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [NgIf, CommonModule, ReactiveFormsModule, MatIconModule, MatTooltipModule]
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

  onUsernameInput(event: any) {
    event.target.value = event.target.value.toLowerCase();
  }
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onLogin() {
    if (this.isSubmitting) {
      return;
    }
    if (!this.isSubmitting && this.loginForm.invalid) {
      for (const key of Object.keys(this.loginForm.controls)) {
        const control = this.loginForm.get(key);
        control?.markAsTouched();
      }
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
