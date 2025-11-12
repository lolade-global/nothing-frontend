// App.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Globe, MapPin, Crown, Medal, Award } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface User {
  id: string;
  username: string;
  country: string;
  countryCode: string;
  isRegistered: boolean;
  totalTime: number;
  lastActive: number;
}

interface LeaderboardEntry {
  userId: string;
  username: string;
  country: string;
  countryCode: string;
  time: number;
  registered: boolean;
  lastUpdate: number;
}

function App() {
  const [sessionTime, setSessionTime] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [showRegistration, setShowRegistration] = useState(false);
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [countryLeaderboard, setCountryLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'global' | 'country'>('global');
  const [isLoading, setIsLoading] = useState(true);
  const [autoDetectedLocation, setAutoDetectedLocation] = useState<{
    country: string;
    countryCode: string;
  } | null>(null);

  // Generate or retrieve userId
  const getUserId = useCallback(() => {
    let userId = localStorage.getItem('nothingbox_userId');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('nothingbox_userId', userId);
    }
    return userId;
  }, []);

  // Initialize app
  useEffect(() => {
    const init = async () => {
      try {
        const userId = getUserId();

        // Try to load existing user
        try {
          const { data } = await axios.get(`${API_URL}/users/${userId}`);
          setUser(data);
          setSessionTime(data.totalTime);
          setIsLoading(false);
        } catch (error) {
          // User doesn't exist, get location and show registration
          const { data: location } = await axios.get(`${API_URL}/location`);
          setAutoDetectedLocation(location);
          setShowRegistration(true);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Init error:', error);
        setIsLoading(false);
      }
    };

    init();
    loadLeaderboards();
  }, [getUserId]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && user) {
      interval = setInterval(() => {
        setSessionTime(prev => {
          const newTime = prev + 1;
          if (newTime % 10 === 0) {
            updateServerTime(newTime);
          }
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, user]);

  // Update time on server
  const updateServerTime = async (time: number) => {
    if (!user) return;
    try {
      await axios.put(`${API_URL}/users/${user.id}/time`, { time });
      loadLeaderboards();
    } catch (error) {
      console.error('Failed to update time:', error);
    }
  };

  // Load leaderboards
  const loadLeaderboards = async () => {
    try {
      const [globalRes, countryRes] = await Promise.all([
        axios.get(`${API_URL}/leaderboard/global`),
        user ? axios.get(`${API_URL}/leaderboard/country/${user.countryCode}`) : Promise.resolve({ data: [] })
      ]);
      setGlobalLeaderboard(globalRes.data);
      setCountryLeaderboard(countryRes.data);
    } catch (error) {
      console.error('Failed to load leaderboards:', error);
    }
  };

  // Register user (anonymous or with username)
  const handleRegister = async (isRegistered: boolean) => {
    if (isRegistered && !username.trim()) {
      alert('Please enter a username');
      return;
    }

    try {
      const userId = getUserId();
      const { data } = await axios.post(`${API_URL}/users`, {
        userId,
        username: isRegistered ? username.trim() : undefined,
        isRegistered
      });
      
      setUser(data);
      setShowRegistration(false);
      
      if (isRegistered) {
        alert('🏆 Registered! You are now eligible for prizes!');
      }
    } catch (error: any) {
      if (error.response?.status === 409) {
        alert('Username already taken. Please choose another.');
      } else {
        alert('Registration failed. Please try again.');
      }
    }
  };

  // Start session
  const handleStart = () => {
    if (!user) {
      alert('Please complete registration first!');
      setShowRegistration(true);
      return;
    }
    setIsActive(true);
    setShowLeaderboard(false);
  };

  // Format time
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  // Get rank icon
  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="text-gray-400 font-mono text-sm">#{index + 1}</span>;
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-2xl text-gray-400">Loading...</div>
      </div>
    );
  }

  if (showRegistration) {
    return (
      <div className="h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-2">The Nothing Box</h1>
            <p className="text-gray-600 text-lg">Do nothing. Win prizes.</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-8 space-y-6">
            {autoDetectedLocation && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  📍 <strong>Auto-detected location:</strong> {autoDetectedLocation.country}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                How do you want to participate?
              </label>
              
              <div className="space-y-3">
                <button
                  onClick={() => handleRegister(false)}
                  className="w-full p-4 border-2 border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all text-left"
                >
                  <div className="font-semibold text-gray-900">Continue as Anonymous</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Play for fun, not eligible for prizes
                  </div>
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-50 text-gray-500">or</span>
                  </div>
                </div>

                <div className="border-2 border-yellow-400 rounded-lg p-4 bg-yellow-50">
                  <div className="flex items-start gap-2 mb-3">
                    <Trophy className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <div className="font-semibold text-gray-900">Register to Win Prizes</div>
                      <div className="text-sm text-gray-700 mt-1">
                        Only registered users are eligible for prizes
                      </div>
                    </div>
                  </div>
                  
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent mb-3"
                    onKeyPress={(e) => e.key === 'Enter' && handleRegister(true)}
                  />
                  
                  <button
                    onClick={() => handleRegister(true)}
                    className="w-full bg-gray-900 text-white p-3 rounded-lg hover:bg-gray-800 transition-colors font-semibold"
                  >
                    Register & Start
                  </button>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-500">
            By participating, you agree to keep the app open and do absolutely nothing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex">
      {/* Main Nothing Area */}
      <div className="flex-1 bg-white flex items-center justify-center relative">
        {!isActive ? (
          <div className="text-center space-y-6">
            <h1 className="text-7xl font-bold text-gray-200">Nothing</h1>
            <button
              onClick={handleStart}
              className="px-10 py-5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors text-xl font-semibold shadow-lg"
            >
              Start Doing Nothing
            </button>
            {user && (
              <div className="text-sm text-gray-500 space-y-1">
                <p>
                  {user.isRegistered ? (
                    <span className="inline-flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      {user.username}
                    </span>
                  ) : (
                    'Anonymous'
                  )} • {user.country}
                </p>
                {sessionTime > 0 && (
                  <p className="font-mono text-gray-700">Total: {formatTime(sessionTime)}</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <div className="text-8xl font-bold text-gray-900 mb-6 font-mono">
              {formatTime(sessionTime)}
            </div>
            <p className="text-gray-500 text-lg">Keep doing nothing...</p>
            <p className="text-gray-400 text-sm mt-2">Saving every 10 seconds</p>
          </div>
        )}

        {/* Toggle Leaderboard Button */}
        {isActive && (
          <button
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="absolute top-6 right-6 p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors shadow-md"
            title="Toggle Leaderboard"
          >
            <Trophy className="w-6 h-6 text-gray-700" />
          </button>
        )}
      </div>

      {/* Leaderboard Sidebar */}
      {showLeaderboard && (
        <div className="w-96 bg-gray-50 border-l border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Leaderboard</h2>
              {user && !user.isRegistered && (
                <button
                  onClick={() => setShowRegistration(true)}
                  className="text-xs bg-yellow-500 text-white px-3 py-1.5 rounded-full hover:bg-yellow-600 font-medium"
                >
                  🏆 Register
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setActiveTab('global');
                  loadLeaderboards();
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all ${
                  activeTab === 'global'
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span className="font-medium">Global</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('country');
                  loadLeaderboards();
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all ${
                  activeTab === 'country'
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span className="font-medium">Country</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {activeTab === 'global' && (
              <div className="space-y-2">
                {globalLeaderboard.length === 0 ? (
                  <p className="text-center text-gray-500 py-12">
                    No scores yet. Be the first to do nothing!
                  </p>
                ) : (
                  globalLeaderboard.map((entry, index) => (
                    <div
                      key={entry.userId}
                      className={`flex items-center gap-3 p-4 rounded-lg transition-all ${
                        entry.userId === user?.id
                          ? 'bg-blue-100 border-2 border-blue-300'
                          : index < 3
                          ? 'bg-white shadow-sm'
                          : 'bg-white'
                      }`}
                    >
                      <div className="w-8 flex items-center justify-center">
                        {getRankIcon(index)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-semibold truncate ${
                            entry.userId === user?.id ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {entry.username}
                            {entry.userId === user?.id && ' (You)'}
                          </p>
                          {entry.registered && (
                            <Trophy className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{entry.country}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm font-medium text-gray-900">
                          {formatTime(entry.time)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'country' && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700 mb-3 px-1">
                  {user?.country || 'Country'}
                </p>
                {countryLeaderboard.length === 0 ? (
                  <p className="text-center text-gray-500 py-12">
                    No scores from {user?.country} yet. Be the first!
                  </p>
                ) : (
                  countryLeaderboard.map((entry, index) => (
                    <div
                      key={entry.userId}
                      className={`flex items-center gap-3 p-4 rounded-lg transition-all ${
                        entry.userId === user?.id
                          ? 'bg-blue-100 border-2 border-blue-300'
                          : index < 3
                          ? 'bg-white shadow-sm'
                          : 'bg-white'
                      }`}
                    >
                      <div className="w-8 flex items-center justify-center">
                        {getRankIcon(index)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-semibold truncate ${
                            entry.userId === user?.id ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {entry.username}
                            {entry.userId === user?.id && ' (You)'}
                          </p>
                          {entry.registered && (
                            <Trophy className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm font-medium text-gray-900">
                          {formatTime(entry.time)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;