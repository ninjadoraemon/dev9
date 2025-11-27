import React from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-slate-900 text-white mt-auto relative z-10">
            <div className="container mx-auto px-4 py-12">
                <div className="grid md:grid-cols-4 gap-8">
                    {/* Brand Section */}
                    <div>
                        <h3 className="text-2xl font-bold mb-4">Nexura</h3>
                        <p className="text-slate-400 text-sm">
                            Your trusted destination for premium digital products, software, and courses.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="font-semibold mb-4">Quick Links</h4>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link to="/products" className="text-slate-400 hover:text-white transition-colors">
                                    Products
                                </Link>
                            </li>
                            <li>
                                <Link to="/about" className="text-slate-400 hover:text-white transition-colors">
                                    About Us
                                </Link>
                            </li>
                            <li>
                                <Link to="/contact" className="text-slate-400 hover:text-white transition-colors">
                                    Contact Us
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="font-semibold mb-4">Legal</h4>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link to="/privacy-policy" className="text-slate-400 hover:text-white transition-colors">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link to="/terms-and-conditions" className="text-slate-400 hover:text-white transition-colors">
                                    Terms & Conditions
                                </Link>
                            </li>
                            <li>
                                <Link to="/refund-policy" className="text-slate-400 hover:text-white transition-colors">
                                    Refund Policy
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="font-semibold mb-4">Contact</h4>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-slate-400" />
                                <a
                                    href="mailto:talentedboyzzz567@gmail.com"
                                    className="text-slate-400 hover:text-white transition-colors"
                                >
                                    talentedboyzzz567@gmail.com
                                </a>
                            </div>
                            <div className="text-slate-400">
                                <p>Erragada, Hyderabad</p>
                                <p>Telangana 500018, India</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-slate-800 mt-8 pt-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-400">
                        <p>
                            © {new Date().getFullYear()} Nexura. All rights reserved.
                        </p>
                        <p>
                            GARIGANTI JASWANTH CHANDRA
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
