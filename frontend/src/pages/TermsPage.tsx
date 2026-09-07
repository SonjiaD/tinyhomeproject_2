import { Footer } from '../components/Footer'
import { Card, SectionLabel, PageLayout } from '../components/ui'

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card padding="lg">
      <SectionLabel className="mb-3">{label}</SectionLabel>
      {children}
    </Card>
  )
}

/**
 * Terms of use. Required alongside the privacy policy before Google will publish the OAuth
 * consent screen. Deliberately plain: this is a free research tool, not a commercial service,
 * and the terms should say so rather than imitate a SaaS contract.
 */
export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-surface-page">
      <div className="bg-primary-900 px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <SectionLabel className="text-teal-400 mb-3">Oakland, California</SectionLabel>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Terms of Use</h1>
          <p className="text-teal-300 leading-relaxed max-w-2xl">
            The short version: this is a free research tool, use it in good faith.
          </p>
        </div>
      </div>

      <PageLayout maxWidth="lg" className="flex-1">
        <div className="space-y-6">
        <Section label="What this is">
          <p className="text-gray-600 leading-relaxed">
            A research tool run by the <strong>Kalyan Lab</strong> at the{' '}
            <strong>University of British Columbia</strong> for gathering community input on
            where tiny home parklets could go in Oakland. It is free to use. It is not a
            commercial service, and it is not affiliated with the City of Oakland.
          </p>
        </Section>

        <Section label="Using it in good faith">
          <p className="text-gray-600 leading-relaxed mb-3">
            The value of this tool depends entirely on the votes being genuine. Please do not:
          </p>
          <ul className="space-y-2 text-sm text-gray-600">
            {[
              'Create multiple accounts to vote more than once',
              'Automate or script voting',
              'Submit deliberately false locations or misleading notes',
              'Attempt to access other people\'s accounts or data',
            ].map(item => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-teal-500 mt-0.5 shrink-0">&ndash;</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="text-gray-600 leading-relaxed mt-4">
            We may remove accounts and their contributions where this happens, because skewed
            data is worse than no data.
          </p>
        </Section>

        <Section label="What your votes mean">
          <p className="text-gray-600 leading-relaxed">
            Voting on a parking spot expresses your view. It does not commit anyone to
            anything, it is not binding on the City of Oakland, and it does not mean a tiny
            home will be placed there. The results inform research and advocacy.
          </p>
        </Section>

        <Section label="Your contributions">
          <p className="text-gray-600 leading-relaxed">
            You keep ownership of what you submit. By using the tool you allow the project to
            use your votes and suggestions in its research, including in published findings, in
            aggregate or de-identified form. How your data is handled is described in the{' '}
            <a href="/privacy" className="text-teal-600 hover:text-teal-500 font-medium underline">
              Privacy Policy
            </a>.
          </p>
        </Section>

        <Section label="No warranty">
          <p className="text-gray-600 leading-relaxed">
            The tool is provided as-is. The parking data is derived from OpenStreetMap and City
            of Oakland open data and will contain errors: spots that no longer exist, spots that
            are missing, distances that are approximate. Do not rely on it for legal, planning
            or property decisions.
          </p>
        </Section>

        <Section label="Questions">
          <p className="text-gray-600 leading-relaxed">
            Contact the <strong>Kalyan Lab</strong> at the University of British Columbia. You
            can ask for a copy of your data or for your account to be deleted at any time.
          </p>
        </Section>
        </div>
      </PageLayout>

      <Footer />
    </div>
  )
}
