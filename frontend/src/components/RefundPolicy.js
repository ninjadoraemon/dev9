import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

const RefundPolicy = () => {
    return (
        <div className="container mx-auto px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl">Cancellation and Refund Policy</CardTitle>
                        <p className="text-sm text-slate-600">Last updated on Nov 25 2025</p>
                    </CardHeader>
                    <CardContent className="prose max-w-none">
                        <div className="space-y-6 text-slate-700">
                            <section className="bg-red-50 border-l-4 border-red-500 p-6 rounded">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-6 h-6 text-red-500 mt-1 flex-shrink-0" />
                                    <div>
                                        <h2 className="text-2xl font-semibold mb-3 text-red-900">No Refunds Policy</h2>
                                        <p className="text-lg font-medium text-red-800">
                                            No cancellations & Refunds are entertained
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">Policy Details</h2>
                                <p>
                                    Due to the nature of digital products, all sales are final. Once you have purchased
                                    and gained access to a digital product, we cannot offer refunds or cancellations.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">Why No Refunds?</h2>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>
                                        <strong>Digital Nature:</strong> Our products are digital goods that are delivered
                                        instantly upon purchase. Once accessed, they cannot be "returned."
                                    </li>
                                    <li>
                                        <strong>Immediate Access:</strong> You receive immediate access to download and use
                                        the product upon successful payment.
                                    </li>
                                    <li>
                                        <strong>Product Information:</strong> Detailed product descriptions, features, and
                                        previews are provided before purchase to help you make an informed decision.
                                    </li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">Before You Purchase</h2>
                                <p>
                                    We encourage you to:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Carefully review all product information and descriptions</li>
                                    <li>Check system requirements for software products</li>
                                    <li>Watch preview videos or demos when available</li>
                                    <li>Contact us if you have any questions before making a purchase</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">Technical Issues</h2>
                                <p>
                                    If you experience technical difficulties accessing your purchased product, please
                                    contact our support team. We will work with you to resolve any legitimate technical
                                    issues, but this does not constitute a refund policy.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">Payment Disputes</h2>
                                <p>
                                    In case of payment disputes or unauthorized transactions, please contact us immediately
                                    at the email address below. We will investigate such cases on an individual basis.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
                                <p>
                                    If you have any questions about this Refund Policy or need assistance, please contact us at:{' '}
                                    <a href="mailto:talentedboyzzz567@gmail.com" className="text-blue-600 hover:underline">
                                        talentedboyzzz567@gmail.com
                                    </a>
                                </p>
                            </section>

                            <section className="mt-8 p-4 bg-slate-100 rounded-lg">
                                <p className="text-sm">
                                    <strong>Business Information:</strong><br />
                                    JASWANTH CHANDRA<br />
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

export default RefundPolicy;
