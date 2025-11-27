import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, MapPin, Building } from 'lucide-react';

const ContactUs = () => {
    return (
        <div className="container mx-auto px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h1 className="text-4xl font-bold mb-8 text-center">Contact Us</h1>

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Mail className="w-5 h-5" />
                                Email
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-600 mb-2">For any inquiries, support, or feedback:</p>
                            <a
                                href="mailto:talentedboyzzz567@gmail.com"
                                className="text-lg font-semibold text-blue-600 hover:underline"
                            >
                                talentedboyzzz567@gmail.com
                            </a>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building className="w-5 h-5" />
                                Business Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-700 font-semibold mb-2">GARIGANTI JASWANTH CHANDRA</p>
                            <div className="flex items-start gap-2 text-slate-600">
                                <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
                                <div>
                                    <p>Erragada, Hyderabad</p>
                                    <p>Telangana 500018</p>
                                    <p>India</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="max-w-4xl mx-auto mt-8">
                    <CardHeader>
                        <CardTitle>Get in Touch</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 text-slate-700">
                            <p>
                                We're here to help! Whether you have questions about our products, need technical
                                support, or want to provide feedback, we'd love to hear from you.
                            </p>

                            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                                <h3 className="font-semibold mb-2">Response Time</h3>
                                <p className="text-sm text-slate-600">
                                    We typically respond to all inquiries within 24-48 hours during business days.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold mb-2">What to Include in Your Email</h3>
                                <ul className="list-disc pl-6 space-y-1 text-sm text-slate-600">
                                    <li>Your name and contact information</li>
                                    <li>Order ID (if applicable)</li>
                                    <li>Detailed description of your inquiry or issue</li>
                                    <li>Screenshots (if reporting a technical issue)</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-semibold mb-2">Common Inquiries</h3>
                                <ul className="list-disc pl-6 space-y-1 text-sm text-slate-600">
                                    <li>Product information and compatibility</li>
                                    <li>Order status and download issues</li>
                                    <li>Technical support</li>
                                    <li>Payment and billing questions</li>
                                    <li>Partnership opportunities</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
};

export default ContactUs;
