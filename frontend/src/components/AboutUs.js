import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, Award, Shield, Zap } from 'lucide-react';

const AboutUs = () => {
    return (
        <div className="container mx-auto px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h1 className="text-4xl font-bold mb-8 text-center">About Us</h1>

                <Card className="max-w-4xl mx-auto mb-8">
                    <CardContent className="pt-6">
                        <div className="space-y-6 text-slate-700">
                            <p className="text-lg">
                                Welcome to <strong>Nexura</strong>, your trusted destination for premium digital
                                products. We specialize in providing high-quality software, applications, and
                                educational courses designed to enhance your productivity and skills.
                            </p>

                            <p>
                                Founded with a vision to make quality digital products accessible to everyone,
                                we carefully curate our collection to ensure that every product meets our high
                                standards of excellence.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Award className="w-5 h-5 text-blue-600" />
                                Our Mission
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-600">
                                To empower individuals and businesses by providing access to top-tier digital
                                products that drive growth, learning, and innovation.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="w-5 h-5 text-yellow-600" />
                                Our Vision
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-600">
                                To become the leading platform for digital products, known for quality,
                                reliability, and exceptional customer experience.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <Card className="max-w-4xl mx-auto mb-8">
                    <CardHeader>
                        <CardTitle>Why Choose Us?</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="flex gap-3">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                        <Award className="w-5 h-5 text-blue-600" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1">Premium Quality</h3>
                                    <p className="text-sm text-slate-600">
                                        Every product is handpicked and verified to ensure the highest quality standards.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                        <Zap className="w-5 h-5 text-green-600" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1">Instant Access</h3>
                                    <p className="text-sm text-slate-600">
                                        Download your purchases immediately after payment confirmation.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                        <Shield className="w-5 h-5 text-purple-600" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1">Secure Payments</h3>
                                    <p className="text-sm text-slate-600">
                                        All transactions are processed through secure, encrypted payment gateways.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                        <ShoppingCart className="w-5 h-5 text-orange-600" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1">Customer Support</h3>
                                    <p className="text-sm text-slate-600">
                                        Our dedicated support team is here to help with any questions or issues.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="max-w-4xl mx-auto">
                    <CardHeader>
                        <CardTitle>Our Commitment</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 text-slate-700">
                            <p>
                                We are committed to maintaining the highest standards of integrity, transparency,
                                and customer satisfaction. Your trust is our most valuable asset, and we work
                                tirelessly to earn it every day.
                            </p>

                            <div className="bg-slate-100 p-4 rounded-lg">
                                <p className="text-sm">
                                    <strong>Business Information:</strong><br />
                                    JASWANTH CHANDRA<br />
                                    Erragada, Hyderabad<br />
                                    Telangana 500018, India<br />
                                    <a href="mailto:talentedboyzzz567@gmail.com" className="text-blue-600 hover:underline">
                                        talentedboyzzz567@gmail.com
                                    </a>
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
};

export default AboutUs;
