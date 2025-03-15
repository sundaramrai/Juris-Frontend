// src/app/app.component.ts
import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  title = 'Juris AI';
  isLoginPage = false;
  isRegisterPage = false;
  isLoggedIn = false;
  isDarkTheme = false;

  constructor(private router: Router, private authService: AuthService) {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.updateRouteState(event.url);
      }
    });
  }

  ngOnInit() {
    this.isLoggedIn = !!localStorage.getItem('token');

    // Load theme preference from localStorage
    const savedTheme = localStorage.getItem('theme');
    this.isDarkTheme = savedTheme === 'dark';
    this.applyTheme();

    this.checkLoginTimestamp();
  }

  toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');

    this.applyTheme();
  }

  private applyTheme(): void {
    if (this.isDarkTheme) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }

  private updateRouteState(currentUrl: string) {
    this.isLoginPage = currentUrl === '/login';
    this.isRegisterPage = currentUrl === '/register';
    this.isLoggedIn = this.authService.isLoggedIn();

    // Redirect logged-in users away from login or register pages.
    if (this.isLoggedIn && (this.isLoginPage || this.isRegisterPage)) {
      console.log("🔄 Redirecting to /tools (already logged in)");
      this.router.navigate(['/tools']);
    }
  }

  checkLoginTimestamp() {
    const loginTimestamp = localStorage.getItem('loginTimestamp');
    if (loginTimestamp) {
      const currentTime = Date.now();
      const twelveHours = 12 * 60 * 60 * 1000;

      if (currentTime - parseInt(loginTimestamp, 10) > twelveHours) {
        console.log("🔴 Auto-logging out due to inactivity");
        this.logout();
      } else {
        const remainingTime = twelveHours - (currentTime - parseInt(loginTimestamp, 10));
        console.log(`⏳ Setting auto-logout timer for ${remainingTime / 1000 / 60} minutes`);
        this.setLogoutTimer(remainingTime);
      }
    }
  }

  setLogoutTimer(timeout: number) {
    setTimeout(() => {
      console.log("⏳ Auto-logging out user...");
      this.logout();
    }, timeout);
  }

  logout() {
    console.log("🔴 Logging out user...");
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('loginTimestamp');
    localStorage.removeItem('token');
    this.isLoggedIn = false;

    // On logout, redirect to home page.
    if (this.router.url !== '/home') {
      console.log("🔄 Redirecting to home page after logout...");
      this.router.navigate(['/home']);
    }
  }

  onLogout() {
    this.logout();
  }

  get loggedInUser(): string | null {
    return this.authService.loggedInUser;
  }

  onHome() {
    this.router.navigate(['/home']);
  }

  onGetStarted() {
    this.router.navigate(['/login']);
  }

  onLogin() {
    this.router.navigate(['/login']);
  }

  isChatbotPage(): boolean {
    return this.router.url === '/tools';
  }

  isLoginOrRegisterPage(): boolean {
    return this.router.url === '/login' || this.router.url === '/register';
  }
}
