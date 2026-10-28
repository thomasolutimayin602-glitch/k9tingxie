'use client';

import React, { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LearningProvider } from '@/context/LearningContext';
import { LoginView } from '@/components/LoginView';
import { Navbar } from '@/components/Navbar';
import { DictationView } from '@/components/DictationView';
import { MistakeBankView } from '@/components/MistakeBankView';
import { SummaryExportView } from '@/components/SummaryExportView';
import { PrintWorksheet } from '@/components/PrintWorksheet';
import { AppTab } from '@/types';

function MainApp() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<AppTab>('dictation');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50/40">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium">加载中...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  // Dedicated full screen print sheet mode
  if (currentTab === 'print') {
    return <PrintWorksheet onBack={() => setCurrentTab('mistakes')} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-amber-50/40 via-white to-orange-50/20 text-slate-900">
      <Navbar currentTab={currentTab} onSelectTab={setCurrentTab} />

      <main className="flex-1 pb-16">
        {currentTab === 'dictation' && <DictationView />}
        {currentTab === 'mistakes' && (
          <MistakeBankView
            onNavigateToPrint={() => setCurrentTab('print')}
            onNavigateToSummary={() => setCurrentTab('summary')}
          />
        )}
        {currentTab === 'summary' && (
          <SummaryExportView onNavigateToPrint={() => setCurrentTab('print')} />
        )}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <LearningProvider>
        <MainApp />
      </LearningProvider>
    </AuthProvider>
  );
}
