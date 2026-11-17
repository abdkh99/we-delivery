import { cookies } from 'next/headers';
import HomeContent from '@/components/HomeContent';

export default async function Home() {
  const cookieStore = await cookies();
  const hasVisited = cookieStore.has('hasVisitedHome');
  const shouldShowLoader = !hasVisited;

  return <HomeContent shouldShowLoader={shouldShowLoader} />;
}
