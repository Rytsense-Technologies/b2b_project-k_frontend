'use client';

import { Suspense } from 'react';
import StudentInterviewsPage from './InterviewsClient';

export default function StudentInterviewsRoute() {
  return (
    <Suspense
      fallback={(
        <div className="animate-fade-in">
          <div className="notice info">
            <div>
              <b>Loading interviews</b>
              Preparing your interview workspace…
            </div>
          </div>
        </div>
      )}
    >
      <StudentInterviewsPage />
    </Suspense>
  );
}
