import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { RecentChatsComponent } from './recent-chats.component';
import { ResponseService } from '../../services/response.service';

describe('RecentChatsComponent', () => {
  let component: RecentChatsComponent;
  let fixture: ComponentFixture<RecentChatsComponent>;
  let responseService: ResponseService;

  beforeEach(async () => {
    const mockUser = { id: 'test-user-id', username: 'testuser' };
    localStorage.setItem('user', JSON.stringify(mockUser));

    await TestBed.configureTestingModule({
      imports: [RecentChatsComponent],
      providers: [
        provideHttpClient(),
        provideRouter([])
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(RecentChatsComponent);
    component = fixture.componentInstance;
    responseService = TestBed.inject(ResponseService);

    vi.spyOn(responseService, 'getAllChats').mockReturnValue(
      of({ chats: [], pagination: { hasMore: false } })
    );

    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
