import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { UserProvider } from './src/context/UserContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { GameProvider } from './src/context/GameContext';
import { ToastProvider } from './src/components/Toast';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <UserProvider>
          <ToastProvider>
            <GameProvider>
              <AppNavigator />
            </GameProvider>
          </ToastProvider>
        </UserProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}