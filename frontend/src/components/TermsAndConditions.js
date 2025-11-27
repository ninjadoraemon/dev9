import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TermsAndConditions = () => {
    return (
        <div className="container mx-auto px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl">Terms and Conditions</CardTitle>
                        <p className="text-sm text-slate-600">Last updated on Nov 25 2025</p>
                    </CardHeader>
                    <CardContent className="prose max-w-none">
                        <div className="space-y-6 text-slate-700">
                            <section>
                                <p>
                                    For the purpose of these Terms and Conditions, the term "we", "us", "our" used
                                    anywhere on this page shall mean <strong>GARIGANTI JASWANTH CHANDRA</strong>, whose
                                    registered/operational office is Erragada, Hyderabad, Telangana 500018. "you", "your",
                                    "user", "visitor" shall mean any natural or legal person who is visiting our website
                                    and/or agreed to purchase from us.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">Use of Website</h2>
                                <p>
                                    Your use of the website and/or purchase from us are governed by the following Terms
                                    and Conditions:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>
                                        The content of the pages of this website is subject to change without notice.
                                    </li>
                                    <li>
                                        Neither we nor any third parties provide any warranty or guarantee as to the accuracy,
                                        timeliness, performance, completeness or suitability of the information and materials
                                        found or offered on this website for any particular purpose. You acknowledge that such
                                        information and materials may contain inaccuracies or errors and we expressly exclude
                                        liability for any such inaccuracies or errors to the fullest extent permitted by law.
                                    </li>
                                    <li>
                                        Your use of any information or materials on our website and/or product pages is entirely
                                        at your own risk, for which we shall not be liable. It shall be your own responsibility
                                        to ensure that any products, services or information available through our website and/or
                                        product pages meet your specific requirements.
                                    </li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">Intellectual Property</h2>
                                <p>
                                    Our website contains material which is owned by or licensed to us. This material includes,
                                    but is not limited to, the design, layout, look, appearance and graphics. Reproduction is
                                    prohibited other than in accordance with the copyright notice, which forms part of these
                                    terms and conditions.
                                </p>
                                <p className="mt-4">
                                    All trademarks reproduced in our website which are not the property of, or licensed to,
                                    the operator are acknowledged on the website.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">Unauthorized Use</h2>
                                <p>
                                    Unauthorized use of information provided by us shall give rise to a claim for damages
                                    and/or be a criminal offense.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">External Links</h2>
                                <p>
                                    From time to time our website may also include links to other websites. These links are
                                    provided for your convenience to provide further information.
                                </p>
                                <p className="mt-4">
                                    You may not create a link to our website from another website or document without
                                    GARIGANTI JASWANTH CHANDRA's prior written consent.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">Governing Law</h2>
                                <p>
                                    Any dispute arising out of use of our website and/or purchase with us and/or any
                                    engagement with us is subject to the laws of India.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">Payment Processing</h2>
                                <p>
                                    We shall be under no liability whatsoever in respect of any loss or damage arising
                                    directly or indirectly out of the decline of authorization for any transaction, on
                                    account of the cardholder having exceeded the preset limit mutually agreed by us with
                                    our acquiring bank from time to time.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">Digital Products</h2>
                                <p>
                                    All digital products sold through this platform are provided "as is" without any
                                    warranties. Upon purchase, you will receive access to download the digital product.
                                    It is your responsibility to download and save the product immediately after purchase.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
                                <p>
                                    For any questions regarding these Terms and Conditions, please contact us at:{' '}
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

export default TermsAndConditions;
