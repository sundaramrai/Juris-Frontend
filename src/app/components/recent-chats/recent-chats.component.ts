import { Component } from '@angular/core';
import { ResponseService } from '../../services/response.service';
import { Message } from '../../Interface';

@Component({
  selector: 'app-recent-chats',
  standalone: false,
  templateUrl: './recent-chats.component.html',
  styleUrl: './recent-chats.component.css'
})
export class RecentChatsComponent {
  constructor(private responseService: ResponseService) {}

  messages: Message[] = [];
  chatSummary: string = '';
  isLoading: boolean = false;
  isMessages: boolean = false;

  ngOnInit(): void {
    this.loadChatHistory();
    this.loadChatSummary();
  }

  loadChatHistory(): void {
    this.isLoading = true;
    this.responseService.getMessages().subscribe({
      next: (messages) => {
        this.messages = messages;
        if (this.messages.length > 0) this.isMessages = true;
        console.log('Chat history loaded', this.messages);
      },
      error: (error) => {
        console.error('Error loading chat history:', error);
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  loadChatSummary(): void {
    this.isLoading = true;
    this.responseService.getChatSummary().subscribe({
      next: (chatSummary) => {
        this.chatSummary = chatSummary;
        console.log('Chat summary loaded', this.chatSummary);
      },
      error: (error) => {
        console.error('Error loading chat summary:', error);
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  refreshChatHistory(): void {
    this.messages = [];
    this.isMessages = false;
    this.ngOnInit();
  }
}
