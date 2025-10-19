import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToolsComponent } from './tools.component';
import "jasmine";

describe('ToolsComponent', () => {
  let component: ToolsComponent;
  let fixture: ComponentFixture<ToolsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ToolsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ToolsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
