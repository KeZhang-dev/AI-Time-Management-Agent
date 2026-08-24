import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AppBackground } from '@/components/AppBackground';
import { LoggedOutNav } from '@/components/LoggedOutNav';

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="mt-10">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
            <div className="mt-3 flex flex-col gap-3 text-base leading-relaxed text-muted-foreground">
                {children}
            </div>
        </section>
    );
}

function BulletList({ items }: { items: ReactNode[] }) {
    return (
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
            {items.map((item, i) => (
                <li key={i}>{item}</li>
            ))}
        </ul>
    );
}

export function PrivacyPolicyPage() {
    return (
        <div className="relative flex min-h-svh flex-col text-foreground">
            <AppBackground />
            <LoggedOutNav />

            <main className="relative z-10 flex-1 px-6 py-16 sm:px-12">
                <article className="mx-auto max-w-2xl">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" />
                        Back to home
                    </Link>

                    <h1 className="mt-6 text-4xl font-semibold tracking-tight">Privacy Policy</h1>
                    <p className="mt-2 text-sm font-medium text-muted-foreground">Last updated: August 25, 2026</p>

                    <p className="mt-8 text-base leading-relaxed text-muted-foreground">
                        KONER ("we", "our", or "the service") is an AI-powered time management application
                        designed to help users understand their time, identify patterns, and improve how they
                        plan and manage their activities.
                    </p>

                    <Section title="1. Information We Collect">
                        <p>KONER may collect information that you provide when using the service, including:</p>
                        <BulletList
                            items={[
                                'Account information, such as your email address and password.',
                                'Time records and activities that you enter into the application.',
                                'Conversations and questions submitted to the AI agent.',
                                'Usage and technical information required to operate and improve the service.',
                            ]}
                        />
                    </Section>

                    <Section title="2. How We Use Your Information">
                        <p>We use the information we collect to:</p>
                        <BulletList
                            items={[
                                'Provide and operate KONER.',
                                'Analyze your time records and generate reports.',
                                'Provide personalized recommendations through the AI agent.',
                                'Improve the performance, reliability, and functionality of the service.',
                                'Protect the service from misuse and security threats.',
                            ]}
                        />
                    </Section>

                    <Section title="3. AI Processing">
                        <p>
                            KONER may use third-party AI services to process information submitted to the AI
                            agent. Information provided to the AI may be processed by these services to generate
                            analysis, recommendations, and responses.
                        </p>
                        <p>
                            We do not intentionally use your personal information to identify you beyond what is
                            necessary to provide the service.
                        </p>
                    </Section>

                    <Section title="4. Data Security">
                        <p>
                            We take reasonable measures to protect your information from unauthorized access,
                            alteration, disclosure, or destruction.
                        </p>
                        <p>However, no online service can guarantee complete security of your data.</p>
                    </Section>

                    <Section title="5. Data Retention">
                        <p>
                            We retain your information only for as long as necessary to provide the service and
                            fulfill the purposes described in this policy, unless a longer retention period is
                            required by law.
                        </p>
                        <p>You may request deletion of your account and associated data by contacting us.</p>
                    </Section>

                    <Section title="6. Third-Party Services">
                        <p>
                            KONER may rely on third-party services for hosting, authentication, analytics, AI
                            processing, and other technical functions necessary to operate the application.
                        </p>
                        <p>These services may process information in accordance with their own privacy policies.</p>
                    </Section>

                    <Section title="7. Your Rights">
                        <p>
                            Depending on your location, you may have rights regarding your personal information,
                            including the right to access, correct, or request deletion of your information.
                        </p>
                        <p>To make a request, contact us using the email address below.</p>
                    </Section>

                    <Section title="8. Changes to This Policy">
                        <p>
                            We may update this Privacy Policy from time to time. Any changes will be reflected on
                            this page with an updated "Last updated" date.
                        </p>
                    </Section>

                    <Section title="9. Contact Us">
                        <p>
                            If you have any questions about this Privacy Policy or how KONER handles your
                            information, please contact:
                        </p>
                        <a
                            href="mailto:kezhangpersonal5@gmail.com"
                            className="font-semibold text-foreground transition-colors hover:text-primary"
                        >
                            kezhangpersonal5@gmail.com
                        </a>
                    </Section>
                </article>
            </main>
        </div>
    );
}
