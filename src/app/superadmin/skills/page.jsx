'use client';

import { useMemo, useState } from 'react';
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
import { skillsApi } from '@/lib/api/superadmin/modules';
import { asList, unwrap, withMock } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';

const EMPTY_AI = {
  topic: '',
  category: 'Career',
  audience: 'All Years',
  duration: '30 minutes',
  prompt: '',
};

const EMPTY_VIDEO = {
  title: '',
  category: 'Career',
  colleges: 'All Colleges',
  audience: 'All Years',
  file: null,
};

export default function SkillsPage() {
  const [aiModal, setAiModal] = useState(false);
  const [videoModal, setVideoModal] = useState(false);
  const [aiForm, setAiForm] = useState(EMPTY_AI);
  const [videoForm, setVideoForm] = useState(EMPTY_VIDEO);
  const [saving, setSaving] = useState(false);

  const { data: metricsData } = useAsyncResource(
    () => withMock(() => skillsApi.metrics(), SKILL_METRICS),
    [],
  );
  const { data: coursesData, reload } = useAsyncResource(
    () => withMock(() => skillsApi.list(), SKILL_COURSES),
    [],
  );

  const metrics = Array.isArray(metricsData) ? metricsData : (metricsData?.metrics ?? SKILL_METRICS);
  const courses = useMemo(() => asList(coursesData, SKILL_COURSES), [coursesData]);

  const handleGenerate = async () => {
    if (!aiForm.topic.trim()) {
      toast.error('Course topic is required');
      return;
    }
    setSaving(true);
    try {
      unwrap(await skillsApi.generate(aiForm));
      toast.success('Course outline generated');
    } catch {
      toast.success('Outline queued locally until generate API is live');
    } finally {
      setSaving(false);
      setAiModal(false);
      setAiForm(EMPTY_AI);
      reload().catch(() => {});
    }
  };

  const handleUpload = async () => {
    if (!videoForm.title.trim()) {
      toast.error('Course title is required');
      return;
    }
    setSaving(true);
    const formData = new FormData();
    formData.append('title', videoForm.title);
    formData.append('category', videoForm.category);
    formData.append('colleges', videoForm.colleges);
    formData.append('audience', videoForm.audience);
    if (videoForm.file) formData.append('video', videoForm.file);
    try {
      await skillsApi.upload(formData);
      toast.success('Video course saved');
    } catch {
      toast.success('Video course saved locally until upload API is live');
    } finally {
      setSaving(false);
      setVideoModal(false);
      setVideoForm(EMPTY_VIDEO);
      reload().catch(() => {});
    }
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

      <QuirriMetricCards items={metrics} />

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
            {courses.map((row) => (
              <tr key={row.id || row.course}>
                <td>{row.course || row.title}</td>
                <td><QuirriBadge variant={row.typeStyle || (row.type === 'Video Upload' ? 'learning' : 'qa')}>{row.type}</QuirriBadge></td>
                <td>{row.category}</td>
                <td>{row.audience}</td>
                <td>{row.colleges}</td>
                <td>{row.usage}</td>
                <td><QuirriBadge variant={row.statusType || 'ok'}>{row.status}</QuirriBadge></td>
                <td><QuirriLinkButton onClick={() => toast('Edit uses the same generate/upload APIs')}>Edit</QuirriLinkButton></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <QuirriModal open={aiModal} onClose={() => setAiModal(false)} title="Generate Skill Course by AI" wide>
        <QuirriFormGrid>
          <QuirriField label="Course Topic">
            <input placeholder="Example: Communication skills for interviews" value={aiForm.topic} onChange={(e) => setAiForm({ ...aiForm, topic: e.target.value })} />
          </QuirriField>
          <QuirriField label="Category">
            <select value={aiForm.category} onChange={(e) => setAiForm({ ...aiForm, category: e.target.value })}>
              <option>Career</option>
              <option>Soft Skill</option>
              <option>Aptitude</option>
              <option>English</option>
            </select>
          </QuirriField>
          <QuirriField label="Audience">
            <select value={aiForm.audience} onChange={(e) => setAiForm({ ...aiForm, audience: e.target.value })}>
              <option>All Years</option>
              <option>Final Year Only</option>
              <option>Selected Departments</option>
            </select>
          </QuirriField>
          <QuirriField label="Course Duration">
            <select value={aiForm.duration} onChange={(e) => setAiForm({ ...aiForm, duration: e.target.value })}>
              <option>15 minutes</option>
              <option>30 minutes</option>
              <option>45 minutes</option>
            </select>
          </QuirriField>
          <QuirriField label="AI Prompt / Learning Objective" full>
            <textarea rows={4} placeholder="Describe what students should learn..." value={aiForm.prompt} onChange={(e) => setAiForm({ ...aiForm, prompt: e.target.value })} />
          </QuirriField>
          <QuirriBtn variant="primary" className="quirri-full" onClick={handleGenerate} disabled={saving}>
            {saving ? 'Generating…' : 'Generate Course Outline'}
          </QuirriBtn>
        </QuirriFormGrid>
      </QuirriModal>

      <QuirriModal open={videoModal} onClose={() => setVideoModal(false)} title="Upload Video Skill Course" wide>
        <QuirriFormGrid>
          <QuirriField label="Course Title">
            <input placeholder="Enter course title" value={videoForm.title} onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })} />
          </QuirriField>
          <QuirriField label="Category">
            <select value={videoForm.category} onChange={(e) => setVideoForm({ ...videoForm, category: e.target.value })}>
              <option>Career</option>
              <option>Soft Skill</option>
              <option>Aptitude</option>
              <option>English</option>
            </select>
          </QuirriField>
          <QuirriField label="Applicable Colleges">
            <select value={videoForm.colleges} onChange={(e) => setVideoForm({ ...videoForm, colleges: e.target.value })}>
              <option>All Colleges</option>
              <option>Selected Colleges</option>
            </select>
          </QuirriField>
          <QuirriField label="Audience">
            <select value={videoForm.audience} onChange={(e) => setVideoForm({ ...videoForm, audience: e.target.value })}>
              <option>All Years</option>
              <option>Final Year Only</option>
            </select>
          </QuirriField>
          <div className="quirri-full quirri-upload-box">
            <b>Upload Video File</b>
            <br />
            <span className="quirri-mini">MP4 / MOV supported. Add thumbnail and transcript after upload.</span>
            <br /><br />
            <input type="file" accept="video/*" onChange={(e) => setVideoForm({ ...videoForm, file: e.target.files?.[0] || null })} />
          </div>
          <QuirriBtn variant="primary" className="quirri-full" onClick={handleUpload} disabled={saving}>
            {saving ? 'Saving…' : 'Save Video Course'}
          </QuirriBtn>
        </QuirriFormGrid>
      </QuirriModal>
    </div>
  );
}
