// import { Routes } from '@angular/router';

// export const routes: Routes = [];


import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { TestUploadComponent } from './test-upload/test-upload.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'home', component: HomeComponent },
    { path: 'test-upload', component: TestUploadComponent },
    { path: '**', redirectTo: '' }
];
