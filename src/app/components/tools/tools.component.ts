import { Component } from '@angular/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { RecentChatsComponent } from '../recent-chats/recent-chats.component';

@Component({
  selector: 'app-tools',
  templateUrl: './tools.component.html',
  styleUrl: './tools.component.css',
  imports: [RouterModule, RecentChatsComponent],
})
export class ToolsComponent {
  constructor(private router: Router, private route: ActivatedRoute) { }

  isAssistantRoute(): boolean {
    return this.router.url.startsWith('/assistant');
  }

  getRouteQueryParams(): any {
    return this.route.snapshot.queryParams;
  }

  handleChatIdChange(newChatId: string): void {
    this.router.navigate(['/assistant'], {
      queryParams: { chatId: newChatId },
      replaceUrl: true
    });
  }
}
