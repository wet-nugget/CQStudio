export const operatorFields = {
  operatorName: 'Operator name', contactEmail: 'Contact email', country: 'Country',
  supabaseDetails: 'Supabase region, processor details and transfer safeguards',
  vercelDetails: 'Vercel processing locations, log retention and processor details',
  emailDetails: 'Email provider, location, retention and processor details',
  technicalLogRetention: 'Technical log retention', backupRetention: 'Backup retention',
  applicableTerms: 'Applicable terms reviewed for the operator',
  hostingStorageDetails: 'Verified hosting storage/cookie disclosures',
  privacyResponsibilities: 'Responsible privacy contact and reviewed privacy responsibilities',
};

export function operatorProblems(config) {
  const problems = [];
  for (const [key, label] of Object.entries(operatorFields)) {
    const value = config[key];
    if (typeof value !== 'string' || !value.trim() || /\[[^\]]+\]|YOUR_|TODO|TBD|example\.(com|test)/i.test(value))
      problems.push(`Complete ${label} in src/config/operator.json.`);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.contactEmail ?? ''))
    problems.push('Supply a valid public contact email in src/config/operator.json.');
  if (!Number.isInteger(config.minimumAge) || config.minimumAge < 18)
    problems.push('The minimum member age must be at least 18.');
  if (config.reviewed !== true)
    problems.push('Review the actual Privacy/Terms/storage disclosures, then set reviewed to true in src/config/operator.json.');
  return problems;
}
