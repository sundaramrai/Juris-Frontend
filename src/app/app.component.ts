// src/app/app.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { CommonModule, NgClass, NgIf } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [NgClass, NgIf, ReactiveFormsModule, CommonModule, MatIconModule, RouterOutlet],
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Juris AI';
  isLoginPage = false;
  isRegisterPage = false;
  isLoggedIn = false;
  isDarkTheme = false;
  private systemThemeMediaQuery: MediaQueryList;
  private mediaQueryListener: ((e: MediaQueryListEvent) => void) | null = null;

  constructor(private router: Router, private authService: AuthService) {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.updateRouteState(event.url);
      }
    });

    this.systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  }

  ngOnInit() {
    this.isLoggedIn = !!localStorage.getItem('token');
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme) {
      this.isDarkTheme = savedTheme === 'dark';
    } else {
      this.isDarkTheme = this.systemThemeMediaQuery.matches;
    }

    this.applyTheme();
    this.mediaQueryListener = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        this.isDarkTheme = e.matches;
        this.applyTheme();
      }
    };

    this.systemThemeMediaQuery.addEventListener('change', this.mediaQueryListener);

    this.checkLoginTimestamp();
  }

  ngOnDestroy() {
    if (this.mediaQueryListener) {
      this.systemThemeMediaQuery.removeEventListener('change', this.mediaQueryListener);
    }
  }

  toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');
    this.applyTheme();
  }

  private applyTheme(): void {
    if (this.isDarkTheme) {
      document.body.classList.add('dark-theme');
      this.updateFavicon('dark');
    } else {
      document.body.classList.remove('dark-theme');
      this.updateFavicon('light');
    }
  }

  private updateFavicon(theme: 'light' | 'dark'): void {
    const favicon = document.getElementById('favicon') as HTMLLinkElement;
    if (favicon) {
      const timestamp = new Date().getTime();
      if (theme === 'dark') {
        favicon.href = `logo-white.svg?v=${timestamp}`;
      } else {
        favicon.href = `logo-blue.svg?v=${timestamp}`;
      }
    } else {
      console.error('Favicon element not found');
    }
  }

  private updateRouteState(currentUrl: string) {
    this.isLoginPage = currentUrl === '/login';
    this.isRegisterPage = currentUrl === '/register';
    this.isLoggedIn = this.authService.isLoggedIn();

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

    this.authService.logout();
    this.isLoggedIn = false;

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
