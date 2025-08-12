import { useState } from 'react';
import { BookEditorShowcase } from './components/BookEditorShowcase';
import { TestResults } from './components/TestResults';

function App() {
    const [activeTab, setActiveTab] = useState<'visual' | 'tests'>('visual');

    return (
        <div className="playground-container">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">📚 Promptbook Components Playground</h1>
                    <p className="text-lg text-gray-600">
                        Visual testing and component showcase for @promptbook/components
                    </p>
                </div>

                {/* Navigation */}
                <div className="flex justify-center mb-8">
                    <div className="bg-white rounded-lg p-1 shadow-sm border">
                        <button
                            onClick={() => setActiveTab('visual')}
                            className={`px-6 py-2 rounded-md font-medium transition-all ${
                                activeTab === 'visual'
                                    ? 'bg-blue-500 text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            🎨 Visual Tests
                        </button>
                        <button
                            onClick={() => setActiveTab('tests')}
                            className={`px-6 py-2 rounded-md font-medium transition-all ${
                                activeTab === 'tests'
                                    ? 'bg-blue-500 text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            🧪 Unit Tests
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-7xl mx-auto">
                    {activeTab === 'visual' && <BookEditorShowcase />}
                    {activeTab === 'tests' && <TestResults />}
                </div>
            </div>
        </div>
    );
}

export default App;
