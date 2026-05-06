import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
  CognitoIdToken,
  CognitoAccessToken,
  CognitoRefreshToken,
} from 'amazon-cognito-identity-js';
import { COGNITO_CLIENT_ID, COGNITO_USER_POOL_ID } from '../config';

// move this to a configuration file later
const poolData = {
  UserPoolId: COGNITO_USER_POOL_ID,
  ClientId: COGNITO_CLIENT_ID,
};

const userPool = new CognitoUserPool(poolData);

export interface AuthResult {
  success: boolean;
  message?: string;
  user?: CognitoUser;
  session?: CognitoUserSession;
}

export const login = (username: string, password: string): Promise<AuthResult> => {
  return new Promise((resolve) => {
    const authenticationDetails = new AuthenticationDetails({
      Username: username,
      Password: password,
    });

    const cognitoUser = new CognitoUser({
      Username: username,
      Pool: userPool,
    });

    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (session) => {
        // Store tokens and username
        localStorage.setItem('accessToken', session.getAccessToken().getJwtToken());
        localStorage.setItem('idToken', session.getIdToken().getJwtToken());
        localStorage.setItem('refreshToken', session.getRefreshToken().getToken());
        localStorage.setItem('username', username);
        resolve({ success: true, session, user: cognitoUser });
      },
      onFailure: (err) => {
        resolve({ success: false, message: err.message });
      },
    });
  });
};

export const logout = (): void => {
  const cognitoUser = userPool.getCurrentUser();
  if (cognitoUser) {
    cognitoUser.signOut();
  }
  localStorage.removeItem('accessToken');
  localStorage.removeItem('idToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('username');
};

export const getCurrentUser = (): CognitoUser | null => {
  let cognitoUser = userPool.getCurrentUser();

  // If no cached user, try to create one from stored username
  if (!cognitoUser) {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      cognitoUser = new CognitoUser({
        Username: storedUsername,
        Pool: userPool,
      });
    }
  }

  return cognitoUser;
};

export const getSession = (): Promise<CognitoUserSession | null> => {
  return new Promise((resolve) => {
    let cognitoUser = userPool.getCurrentUser();

    // If no cached user, try to create one from stored tokens
    if (!cognitoUser) {
      const storedUsername = localStorage.getItem('username');
      const accessToken = localStorage.getItem('accessToken');
      const idToken = localStorage.getItem('idToken');
      const refreshToken = localStorage.getItem('refreshToken');

      if (storedUsername && accessToken && idToken && refreshToken) {
        cognitoUser = new CognitoUser({
          Username: storedUsername,
          Pool: userPool,
        });

        // Create session from stored tokens
        const session = new CognitoUserSession({
          IdToken: new CognitoIdToken({ IdToken: idToken }),
          AccessToken: new CognitoAccessToken({ AccessToken: accessToken }),
          RefreshToken: new CognitoRefreshToken({ RefreshToken: refreshToken }),
        });

        // Cache the user for future use
        // const userData = {
        //   Username: storedUsername,
        //   Pool: userPool,
        // };
        const keyPrefix = `CognitoIdentityServiceProvider.${poolData.ClientId}`;
        const lastUserKey = `${keyPrefix}.LastAuthUser`;
        const userKey = `${keyPrefix}.${storedUsername}`;

        localStorage.setItem(lastUserKey, storedUsername);
        localStorage.setItem(`${userKey}.accessToken`, accessToken);
        localStorage.setItem(`${userKey}.idToken`, idToken);
        localStorage.setItem(`${userKey}.refreshToken`, refreshToken);

        resolve(session);
        return;
      } else {
        resolve(null);
        return;
      }
    }

    // Use existing cached user
    cognitoUser.getSession((err: any, session: CognitoUserSession | null) => {
      if (err) {
        resolve(null);
      } else {
        resolve(session);
      }
    });
  });
};

export const forgotPassword = (username: string): Promise<AuthResult> => {
  return new Promise((resolve) => {
    const cognitoUser = new CognitoUser({
      Username: username,
      Pool: userPool,
    });

    cognitoUser.forgotPassword({
      onSuccess: () => {
        resolve({ success: true });
      },
      onFailure: (err) => {
        resolve({ success: false, message: err.message });
      },
    });
  });
};

export const confirmPassword = (
  username: string,
  code: string,
  newPassword: string
): Promise<AuthResult> => {
  return new Promise((resolve) => {
    const cognitoUser = new CognitoUser({
      Username: username,
      Pool: userPool,
    });

    cognitoUser.confirmPassword(code, newPassword, {
      onSuccess: () => {
        resolve({ success: true });
      },
      onFailure: (err) => {
        resolve({ success: false, message: err.message });
      },
    });
  });
};

export const refreshSession = (): Promise<CognitoUserSession | null> => {
  return new Promise((resolve) => {
    let cognitoUser = userPool.getCurrentUser();

    // If no cached user, try to create one from stored username
    if (!cognitoUser) {
      const storedUsername = localStorage.getItem('username');
      if (storedUsername) {
        cognitoUser = new CognitoUser({
          Username: storedUsername,
          Pool: userPool,
        });
      } else {
        resolve(null);
        return;
      }
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      resolve(null);
      return;
    }

    cognitoUser.refreshSession({ getToken: () => refreshToken }, (err, session) => {
      if (err) {
        resolve(null);
      } else {
        localStorage.setItem('accessToken', session.getAccessToken().getJwtToken());
        localStorage.setItem('idToken', session.getIdToken().getJwtToken());
        localStorage.setItem('refreshToken', session.getRefreshToken().getToken());
        resolve(session);
      }
    });
  });
};

export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return Date.now() > payload.exp * 1000;
  } catch {
    return true;
  }
}

export function willExpireSoon(token: string, bufferMs = 5 * 60 * 1000): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return Date.now() > payload.exp * 1000 - bufferMs;
  } catch {
    return true;
  }
}

export async function validateOrRefreshSession(): Promise<boolean> {
  const token = localStorage.getItem('accessToken');

  if (!token || isTokenExpired(token) || willExpireSoon(token)) {
    const session = await refreshSession();
    return session !== null;
  }

  return true;
}