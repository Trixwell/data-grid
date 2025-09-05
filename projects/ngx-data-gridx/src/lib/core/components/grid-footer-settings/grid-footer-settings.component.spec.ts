import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GridFooterSettingsComponent } from './grid-footer-settings.component';

describe('GridFooterSettingsComponent', () => {
  let component: GridFooterSettingsComponent;
  let fixture: ComponentFixture<GridFooterSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GridFooterSettingsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GridFooterSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
