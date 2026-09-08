import GameApp from '@/src/ui/game-app';
import SaaSApp from '@/src/saas/saas-app';

export default function Home() {
  return process.env.NEXT_PUBLIC_SAAS_MODE === 'true' ? (
    <SaaSApp />
  ) : (
    <GameApp />
  );
}
