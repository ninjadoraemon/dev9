import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PrivacyPolicy = () => {
    return (
        <div className="container mx-auto px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl">Privacy Policy</CardTitle>
                        <p className="text-sm text-slate-600">Last updated on Nov 25 2025</p>
                    </CardHeader>
                    <CardContent className="prose max-w-none">
                        <div className="space-y-6 text-slate-700">
                            <section>
                                <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
                                <p>
                                    We collect information that you provide directly to us when you create an account,
                                    make a purchase, or communicate with us. This may include your name, email address,
                                    and payment information.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
                                <p>We use the information we collect to:</p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Process your transactions and deliver digital products</li>
                                    <li>Send you order confirmations and updates</li>
                                    <li>Respond to your comments and questions</li>
                                    <li>Improve our services and user experience</li>
                                    <li>Comply with legal obligations</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">Information Sharing</h2>
                                <p>
                                    We do not sell, trade, or otherwise transfer your personally identifiable information
                                    to outside parties except as required to process your transactions (such as payment
                                    processors) or as required by law.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
                                <p>
                                    We implement appropriate security measures to protect your personal information.
                                    However, no method of transmission over the Internet or electronic storage is 100%
                                    secure, and we cannot guarantee absolute security.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">Cookies</h2>
                                <p>
                                    We use cookies to enhance your experience, analyze site traffic, and personalize
                                    content. You can choose to disable cookies through your browser settings, though
                                    this may affect your ability to use certain features of our website.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">Third-Party Services</h2>
                                <p>
                                    We use third-party services for payment processing (Razorpay) and authentication
                                    (Clerk). These services have their own privacy policies governing the use of your
                                    information.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
                                <p>You have the right to:</p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Access the personal information we hold about you</li>
                                    <li>Request correction of inaccurate information</li>
                                    <li>Request deletion of your personal information</li>
                                    <li>Opt-out of marketing communications</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">Changes to This Policy</h2>
                                <p>
                                    We may update this privacy policy from time to time. We will notify you of any
                                    changes by posting the new policy on this page and updating the "Last updated" date.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
                                <p>
                                    If you have any questions about this Privacy Policy, please contact us at:{' '}
                                    <a href="mailto:talentedboyzzz567@gmail.com" className="text-blue-600 hover:underline">
                                        talentedboyzzz567@gmail.com
                                    </a>
                                </p>
                            </section>

                            <section className="mt-8 p-4 bg-slate-100 rounded-lg">
                                <p className="text-sm">
                                    <strong>Business Information:</strong><br />
                                    GARIGANTI JASWANTH CHANDRA<br />
                                    Erragada, Hyderabad<br />
                                    Telangana 500018, India
                                </p>
                            </section>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
};

export default PrivacyPolicy;
