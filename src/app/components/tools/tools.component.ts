// src/app/components/tools/tools.component.ts
import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-tools',
  standalone: false,
  templateUrl: './tools.component.html',
  styleUrl: './tools.component.css'
})
export class ToolsComponent {
  constructor(private router: Router, private route: ActivatedRoute) {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
  }

  isAssistantRoute(): boolean {
    return this.router.url.startsWith('/tools/assistant');
  }

  getRouteQueryParams(): any {
    return this.route.snapshot.queryParams;
  }

  handleChatIdChange(newChatId: string): void {
    this.router.navigate(['/tools/assistant'], {
      queryParams: { chatId: newChatId },
      replaceUrl: true
    });
  }
}
