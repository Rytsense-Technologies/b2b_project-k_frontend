'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  Icon,
  KpiRow,
  ModuleBanner,
  ModulePage,
  Panel,
  SectionState,
} from '@/components/shared/module-ui';
import { facultyDirectoryApi } from '@/lib/api/faculty/directory';
import { apiErrorMessage, asList } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';

export default function FacultySubjectsPage() {
  const { data, loading, error, reload } = useAsyncResource(
    () => facultyDirectoryApi.subjects(),
    [],
  );

  const items = useMemo(() => asList(data, []), [data]);
  const published = items.reduce((n, s) => n + (s.published || 0), 0);
  const inReview = items.reduce((n, s) => n + (s.in_review || 0), 0);

  return (
    <ModulePage>
      <ModuleBanner
        icon="book"
        eyebrow="Content"
        title="Subjects"
        lede="Chapters in your department and how far each is through review."
        actions={(
          <Link className="sd-btn sd-btn--amber" href="/faculty/content">
            <Icon name="layers" size={16} /> Open content review
          </Link>
        )}
      />

      <KpiRow
        label="Subject summary"
        items={[
          { icon: 'book', label: 'Chapters', value: items.length, sub: 'Grouped by title' },
          { icon: 'tick', label: 'Published videos', value: published, sub: 'Live for students' },
          { icon: 'alert', label: 'In review', value: inReview, sub: 'Waiting on HOD / faculty' },
        ]}
      />

      <Panel title="Your chapters" sub="Interim subject view until the subject catalogue is live." bodyClassName={null}>
        {loading ? (
          <SectionState title="Loading subjects">Fetching chapters in your department.</SectionState>
        ) : error ? (
          <SectionState
            tone="err"
            title="Could not load subjects"
            action={<button type="button" className="sd-btn sd-btn--ghost" onClick={() => reload()}>Retry</button>}
          >
            {apiErrorMessage(error, 'Try again in a moment.')}
          </SectionState>
        ) : items.length === 0 ? (
          <SectionState title="No chapters yet">
            {data?.note || 'Upload or wait for college admin content in your department.'}
          </SectionState>
        ) : (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr>
                  <th>Chapter / subject</th>
                  <th className="num">Total</th>
                  <th className="num">Published</th>
                  <th className="num">In review</th>
                  <th className="num">Generating</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.title}>
                    <td>{s.title}</td>
                    <td className="num">{s.total}</td>
                    <td className="num">{s.published}</td>
                    <td className="num">{s.in_review}</td>
                    <td className="num">{s.generating}</td>
                    <td>
                      <Link className="sd-btn sd-btn--ghost" href="/faculty/content">
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </ModulePage>
  );
}
