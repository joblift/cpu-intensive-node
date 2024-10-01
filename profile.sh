#!/bin/bash
baseUrl="http://localhost:3003"
adminUrl="http://localhost:3004"

profilesDir="$HOME/profiles"

# Check if the first argument (mode) is provided
if [ -z "$1" ]; then
  echo "Starts nodejs profiling, executes a long running request with the specified mode and duration,"
  echo "and then stops the profiler. Stores the cpu profile in profiles directory $profilesDir."
  echo ""
  echo "Usage: $0 <mode> [duration]"
  exit 1
fi

mode=$1
duration=${2:-10000}  # Default value for duration is 10000 milli seconds (aka 10 seconds) if not provided

echo "Mode: $mode"
echo "Duration: $duration"
echo "Profiles dir: $profilesDir"
echo ""
mkdir -p "$profilesDir"

# First, start profiling
curl -s -X POST "$adminUrl/startProfiler" > /dev/null 2>&1
# trigger a long running request
echo "...triggering long running request $baseUrl/?duration=$duration&mode=$mode" 
curl -s "$baseUrl/?duration=$duration&mode=$mode" > /dev/null 2>&1  &
first_pid=$!

# Wait for 1 second and then trigger a fast request
sleep 1
echo "...triggering fast request $baseUrl/"
curl -s "$baseUrl/"  > /dev/null 2>&1 &
second_pid=$!

echo -e "...waiting for the second request to complete"
wait $second_pid

echo ""
if ps -p $first_pid > /dev/null; then
  echo -e "\033[32mGREAT\033[0m - the second request was answered before the first request completed"
else
  echo -e "\033[31mBAD\033[0m - the second request was answered after the first request completed"
fi

# Now lets wait for the first request to complete
echo -e "\n...waiting for the first request to complete"
wait $first_pid

echo -e "\nWriting profile to $profilesDir/$mode.cpuprofile"
curl -s -X POST "$adminUrl/stopProfiler" > "$profilesDir/$mode.cpuprofile"