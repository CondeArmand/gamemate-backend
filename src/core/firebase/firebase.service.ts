import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as console from 'node:console';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private app: admin.app.App;

  onModuleInit(): any {
    const serviceAccountPath =
      process.env.NODE_ENV === 'production'
        ? '/etc/secrets/firebase-service-account.json' // Render monta os secret files aqui
        : path.resolve('./firebase-service-account.json');

    try {
      if (!admin.apps.length) {
        this.app = admin.initializeApp({
          credential: admin.credential.cert(serviceAccountPath),
        });
        console.log('Firebase Admin SDK inicializado com sucesso');
      } else {
        this.app = admin.app();
        console.log('Firebase Admin SDK já inicializado');
      }
    } catch (error) {
      console.error('Erro ao inicializar o Firebase Admin SDK:', error);
      throw error;
    }
  }
  getAuth(): admin.auth.Auth {
    if (!this.app) {
      throw new Error('Firebase Admin SDK não inicializado');
    }
    return admin.auth();
  }
}
