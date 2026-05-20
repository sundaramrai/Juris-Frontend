import { Component, inject } from '@angular/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { RecentChatsComponent } from '../recent-chats/recent-chats.component';

@Component({
  selector: 'app-tools',
  templateUrl: './tools.component.html',
  styleUrl: './tools.component.css',
  imports: [RouterModule, RecentChatsComponent],
})
export class ToolsComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

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
