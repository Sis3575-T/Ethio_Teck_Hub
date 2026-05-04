import { useEffect, useState } from 'react';
import { getLeaderboard } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getLeaderboard()
      .then((res) => {
        if (!mounted) return;
        setData(res.data);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.response?.data?.error || err.message || 'Failed to load leaderboard');
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <div className="p-8">Loading leaderboard...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  const top = data?.top || [];
  const me = data?.me || null;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Leaderboard</h1>

      {top.length === 0 && !me && <div>No leaderboard data available.</div>}

      {top.length > 0 && (
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-left">Rank</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Score</th>
            </tr>
          </thead>
          <tbody>
            {top.map((row) => {
              const isMe = user && String(user._id || user.id) === String(row.studentId);
              return (
                <tr key={row.studentId} className={isMe ? 'font-semibold bg-yellow-50' : ''}>
                  <td className="px-4 py-2">{row.rank}</td>
                  <td className="px-4 py-2">{row.displayName}</td>
                  <td className="px-4 py-2">{(row.compositeScore || 0).toFixed(4)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {me && (!top.some((t) => String(t.studentId) === String(me.studentId))) && (
        <div className="mt-6">
          <h2 className="font-semibold">Your Rank</h2>
          <div className="mt-2 p-3 border rounded bg-gray-50">
            <div>{me.displayName}</div>
            <div>Rank: {me.rank ?? '—'}</div>
            <div>Score: {(me.compositeScore || 0).toFixed(4)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
