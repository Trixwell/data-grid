import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvokeBtnComponent } from './invoke-btn.component';

describe('InvokeBtnComponent', () => {
  let component: InvokeBtnComponent;
  let fixture: ComponentFixture<InvokeBtnComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvokeBtnComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvokeBtnComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
