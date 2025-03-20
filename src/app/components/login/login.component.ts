// src/app/components/login/login.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  isLoading = false;
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
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;
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
