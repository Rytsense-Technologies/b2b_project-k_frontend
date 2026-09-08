'use client';

import { useEffect, useMemo } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { QuirriField, QuirriRHFField } from '@/components/superadmin/quirri-ui';
import QuirriCombobox from '@/components/superadmin/QuirriCombobox';
import {
  INDIA_COUNTRY,
  getIndiaStateOptions,
  getIndiaDistrictOptions,
} from '@/lib/india';

/**
 * India-only location block: Country (locked) → State → District → City → Pincode.
 * State/district use typeahead comboboxes. Use on every institution address form.
 */
export default function IndiaLocationFields({
  control,
  setValue,
  includeDistrict = true,
  includePincode = true,
  includeCity = true,
}) {
  const state = useWatch({ control, name: 'state' }) || '';
  const district = useWatch({ control, name: 'district' }) || '';
  const districtOptions = useMemo(() => getIndiaDistrictOptions(state), [state]);
  const stateOptions = useMemo(() => getIndiaStateOptions(), []);

  useEffect(() => {
    if (!includeDistrict || !district) return;
    const ok = districtOptions.some((o) => o.value === district);
    if (!ok) setValue('district', '', { shouldValidate: true, shouldDirty: true });
  }, [state, district, districtOptions, includeDistrict, setValue]);

  return (
    <>
      <QuirriField
        label="Country"
        hint="Quirri is available in India only."
      >
        <input
          value={INDIA_COUNTRY.name}
          disabled
          readOnly
          style={{ background: 'var(--line-soft)', color: 'var(--muted)' }}
          aria-label="Country"
        />
      </QuirriField>

      <Controller
        control={control}
        name="state"
        render={({ field, fieldState }) => (
          <QuirriCombobox
            id="india-state"
            label="State / UT"
            placeholder="Type to find a state…"
            value={field.value || ''}
            onChange={(e) => {
              field.onChange(e);
              if (includeDistrict) {
                setValue('district', '', { shouldValidate: true, shouldDirty: true });
              }
            }}
            onBlur={field.onBlur}
            name={field.name}
            error={fieldState.error?.message}
            options={stateOptions}
            emptyMessage="No state matches that spelling"
          />
        )}
      />

      {includeDistrict ? (
        <Controller
          control={control}
          name="district"
          render={({ field, fieldState }) => (
            <QuirriCombobox
              id="india-district"
              label="District"
              placeholder={state ? 'Type to find a district…' : 'Select a state first'}
              value={field.value || ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              error={fieldState.error?.message}
              options={districtOptions}
              disabled={!state}
              emptyMessage={state ? 'No district matches that spelling' : 'Select a state first'}
            />
          )}
        />
      ) : null}

      {includeCity ? (
        <QuirriRHFField
          control={control}
          name="city"
          fieldType="placeName"
          label="City"
          placeholder="City or town"
        />
      ) : null}

      {includePincode ? (
        <QuirriRHFField
          control={control}
          name="pincode"
          fieldType="pincode"
          label="Pincode"
          placeholder="600001"
          hint="6-digit Indian pincode"
        />
      ) : null}
    </>
  );
}
