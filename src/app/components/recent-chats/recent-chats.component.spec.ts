import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecentChatsComponent } from './recent-chats.component';

describe('RecentChatsComponent', () => {
  let component: RecentChatsComponent;
  let fixture: ComponentFixture<RecentChatsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RecentChatsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecentChatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
