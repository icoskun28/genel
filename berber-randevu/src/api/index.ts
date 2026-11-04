import { isFirebaseConfigured } from '../config';
import { Api } from '../types';
import { demoApi } from './demo';
import { firebaseApi } from './firebase';

export const api: Api = isFirebaseConfigured ? firebaseApi : demoApi;
