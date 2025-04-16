import { TestBed } from '@angular/core/testing';

import { ImageDescribeService } from './image-describe.service';

describe('ImageDescribeService', () => {
  let service: ImageDescribeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImageDescribeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
