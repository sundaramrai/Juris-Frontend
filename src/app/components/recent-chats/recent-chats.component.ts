import { Component, OnInit, OnDestroy } from '@angular/core';
import { ResponseService } from '../../services/response.service';
import { ChatInfo } from '../../Interface';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
@Component({
  selector: 'app-recent-chats',
  templateUrl: './recent-chats.component.html',
  styleUrls: ['./recent-chats.component.css'],
  imports: [DatePipe, MatIconModule, MatTooltipModule],
})
export class RecentChatsComponent implements OnInit, OnDestroy {
  chats: ChatInfo[] = [];
  isLoading: boolean = false;
  currentChatId: string | null = null;
  loadingError: boolean = false;
  errorMessage: string = '';
  currentPage: number = 1;
  hasMoreChats: boolean = false;
  private chatIdSubscription: Subscription | null = null;

  constructor(
    private responseService: ResponseService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadAllChats();
    this.chatIdSubscription = this.responseService.currentChatId$.subscribe(chatId => {
      this.currentChatId = chatId;
    });
  }

  ngOnDestroy(): void {
    if (this.chatIdSubscription) {
      this.chatIdSubscription.unsubscribe();
    }
  }

  get chatsWithMessages(): ChatInfo[] {
    return this.chats.filter(chat => chat.messageCount && chat.messageCount > 0);
  }

  loadAllChats(refresh: boolean = true): void {
    this.isLoading = true;
    this.loadingError = false;

    if (refresh) {
      this.currentPage = 1;
      this.chats = [];
    }

    this.responseService.getAllChats(this.currentPage).subscribe({
      next: (response) => {
        if (refresh) {
          this.chats = response.chats;
        } else {
          this.chats = [...this.chats, ...response.chats];
        }
        this.hasMoreChats = response.pagination.hasMore;
        this.currentPage++;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading chats:', error);
        this.loadingError = true;
        this.errorMessage = error.message || 'Failed to load chats. Please try again.';
        this.isLoading = false;
      }
    });
  }

  loadMoreChats(): void {
    if (this.hasMoreChats && !this.isLoading) {
      this.loadAllChats(false);
    }
  }

  refreshChats(): void {
    this.loadAllChats(true);
  }

  openChat(chatId: string): void {
    const chat = this.chats.find(chat => chat.chatId === chatId);

    if (chat && chat.messageCount && chat.messageCount > 0) {
      this.responseService.setCurrentChatId(chatId);
      this.router.navigate(['/assistant'], { queryParams: { chatId } });
    } else {
      this.createNewChat();
    }
  }

  createNewChat(): void {
    this.responseService.setCurrentChatId(null);
    this.router.navigate(['/assistant']);
  }
}
