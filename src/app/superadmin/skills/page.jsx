'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import QuirriBadge from '@/components/superadmin/QuirriBadge';
import QuirriModal from '@/components/superadmin/QuirriModal';
import {
  QuirriToolbar,
  QuirriMetricCards,
  QuirriBtn,
  QuirriLinkButton,
  QuirriFormGrid,
  QuirriField,
} from '@/components/superadmin/quirri-ui';
import { SKILL_METRICS, SKILL_COURSES } from '@/lib/mock/superadminData';

export default function SkillsPage() {
  const [aiModal, setAiModal] = useState(false);
  const [videoModal, setVideoModal] = useState(false);

  const handleGenerate = () => {
    toast.success('Course outline generated (mock)');
    setAiModal(false);
  };

  const handleUpload = () => {
    toast.success('Video course saved (mock)');
    setVideoModal(false);
  };

  return (
    <div className="animate-fade-in">
      <QuirriToolbar
        title="AI Skill Improvement Courses"
        subtitle="Quirri-created non-subject courses for skill development."
      >
        <QuirriBtn variant="primary" onClick={() => setAiModal(true)}>Generate by AI</QuirriBtn>
        <QuirriBtn variant="light" onClick={() => setVideoModal(true)}>Upload Video Course</QuirriBtn>
      </QuirriToolbar>

      <QuirriMetricCards items={SKILL_METRICS} />

      <div className="quirri-card quirri-table-wrap">
        <table className="quirri-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Creation Type</th>
              <th>Category</th>
              <th>Audience</th>
              <th>Assigned Colleges</th>
              <th>Usage</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {SKILL_COURSES.map((row) => (
              <tr key={row.course}>
                <td>{row.course}</td>
                <td><QuirriBadge variant={row.typeStyle}>{row.type}</QuirriBadge></td>
                <td>{row.category}</td>
                <td>{row.audience}</td>
                <td>{row.colleges}</td>
                <td>{row.usage}</td>
                <td><QuirriBadge variant={row.statusType}>{row.status}</QuirriBadge></td>
                <td><QuirriLinkButton>Edit</QuirriLinkButton></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <QuirriModal open={aiModal} onClose={() => setAiModal(false)} title="Generate Skill Course by AI" wide>
        <QuirriFormGrid>
          <QuirriField label="Course Topic">
            <input placeholder="Example: Communication skills for interviews" />
          </QuirriField>
          <QuirriField label="Category">
            <select defaultValue="career">
              <option>Career</option>
              <option>Soft Skill</option>
              <option>Aptitude</option>
              <option>English</option>
            </select>
          </QuirriField>
          <QuirriField label="Audience">
            <select defaultValue="all">
              <option>All Years</option>
              <option>Final Year Only</option>
              <option>Selected Departments</option>
            </select>
          </QuirriField>
          <QuirriField label="Course Duration">
            <select defaultValue="30">
              <option>15 minutes</option>
              <option>30 minutes</option>
              <option>45 minutes</option>
            </select>
          </QuirriField>
          <QuirriField label="AI Prompt / Learning Objective" full>
            <textarea rows={4} placeholder="Describe what students should learn..." />
          </QuirriField>
          <QuirriBtn variant="primary" className="quirri-full" onClick={handleGenerate}>
            Generate Course Outline
          </QuirriBtn>
        </QuirriFormGrid>
      </QuirriModal>

      <QuirriModal open={videoModal} onClose={() => setVideoModal(false)} title="Upload Video Skill Course" wide>
        <QuirriFormGrid>
          <QuirriField label="Course Title">
            <input placeholder="Enter course title" />
          </QuirriField>
          <QuirriField label="Category">
            <select defaultValue="career">
              <option>Career</option>
              <option>Soft Skill</option>
              <option>Aptitude</option>
              <option>English</option>
            </select>
          </QuirriField>
          <QuirriField label="Applicable Colleges">
            <select defaultValue="all">
              <option>All Colleges</option>
              <option>Selected Colleges</option>
            </select>
          </QuirriField>
          <QuirriField label="Audience">
            <select defaultValue="all">
              <option>All Years</option>
              <option>Final Year Only</option>
            </select>
          </QuirriField>
          <div className="quirri-full quirri-upload-box">
            <b>Upload Video File</b>
            <br />
            <span className="quirri-mini">MP4 / MOV supported. Add thumbnail and transcript after upload.</span>
            <br /><br />
            <input type="file" accept="video/*" />
          </div>
          <QuirriBtn variant="primary" className="quirri-full" onClick={handleUpload}>
            Save Video Course
          </QuirriBtn>
        </QuirriFormGrid>
      </QuirriModal>
    </div>
  );
}
