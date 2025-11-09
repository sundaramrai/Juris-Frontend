// src/app/app.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { NgClass } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [NgClass, MatIconModule, RouterOutlet, MatMenuModule],
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Juris AI';
  isLoginPage = false;
  isRegisterPage = false;
  isLoggedIn = false;
  isDarkTheme = false;
  username: string | undefined;
  private systemThemeMediaQuery: MediaQueryList;
  private mediaQueryListener: ((e: MediaQueryListEvent) => void) | null = null;
  private routerSubscription: any;

  constructor(private router: Router, private authService: AuthService) {
    this.systemThemeMediaQuery = globalThis.matchMedia('(prefers-color-scheme: dark)');
  }

  ngOnInit() {
    this.username = JSON.parse(localStorage.getItem('user') || '{}').username || undefined;
    this.routerSubscription = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) this.updateRouteState(event.url);
    });

    this.isLoggedIn = !!localStorage.getItem('token');
    const savedTheme = localStorage.getItem('theme');
    this.isDarkTheme = savedTheme ? savedTheme === 'dark' : this.systemThemeMediaQuery.matches;
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
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  toggleTheme = (): void => {
    this.isDarkTheme = !this.isDarkTheme;
    localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');
    this.applyTheme();
  };

  private applyTheme = (): void => {
    document.body.classList.toggle('dark-theme', this.isDarkTheme);
    this.updateFavicon(this.isDarkTheme ? 'dark' : 'light');
  };

  private updateFavicon = (theme: 'light' | 'dark'): void => {
    const favicon = document.getElementById('favicon') as HTMLLinkElement;
    if (favicon) {
      const timestamp = Date.now();
      favicon.href = `${theme === 'dark' ? 'logo-white.svg' : 'logo-blue.svg'}?v=${timestamp}`;
    }
  };

  private updateRouteState = (currentUrl: string) => {
    this.isLoginPage = currentUrl === '/login';
    this.isRegisterPage = currentUrl === '/register';
    this.isLoggedIn = this.authService.isLoggedIn();

    if (this.isLoggedIn && (this.isLoginPage || this.isRegisterPage)) {
      this.router.navigate(['/tools']);
    }
  };

  checkLoginTimestamp = () => {
    const loginTimestamp = localStorage.getItem('loginTimestamp');
    if (loginTimestamp) {
      const elapsed = Date.now() - Number.parseInt(loginTimestamp, 10);
      if (elapsed > TWELVE_HOURS_MS) {
        this.logout();
      } else {
        this.setLogoutTimer(TWELVE_HOURS_MS - elapsed);
      }
    }
  };

  setLogoutTimer = (timeout: number) => {
    setTimeout(this.logout, timeout);
  };

  logout = () => {
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('loginTimestamp');
    localStorage.removeItem('token');
    this.authService.logout();
    this.isLoggedIn = false;
    if (this.router.url !== '/home') {
      this.router.navigate(['/home']);
    }
  };

  onLogout = () => this.logout();

  get loggedInUser(): string | null {
    return this.authService.loggedInUser;
  }

  onHome = () => this.router.navigate(['/home']);
  onGetStarted = () => this.router.navigate(['/login']);
  onLogin = () => this.router.navigate(['/login']);

  isChatbotPage = (): boolean => this.router.url === '/tools';
  isLoginOrRegisterPage = (): boolean => ['/login', '/register'].includes(this.router.url);
}
