import { healthStore } from '@/health/store';
import { HealthSection } from '@/ui/health-section';
import { SettingsPage } from '@/ui/settings-kit';

export default function HealthSettings() {
  return (
    <SettingsPage
      title={healthStore.name}
      intro={`See what you burn next to what you eat, keep your weight in one place, and save what you log to ${healthStore.name}. Graze never reads food from other apps.`}
    >
      <HealthSection />
    </SettingsPage>
  );
}
