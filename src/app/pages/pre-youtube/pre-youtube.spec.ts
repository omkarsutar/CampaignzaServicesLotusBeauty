import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreYoutube } from './pre-youtube';

describe('PreYoutube', () => {
  let component: PreYoutube;
  let fixture: ComponentFixture<PreYoutube>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreYoutube],
    }).compileComponents();

    fixture = TestBed.createComponent(PreYoutube);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
