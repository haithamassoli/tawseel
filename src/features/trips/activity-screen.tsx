import type { FunctionReturnType } from 'convex/server';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import i18n from 'i18next';
import * as React from 'react';

import {
  ActivityIndicator,
  Button,
  FocusAwareStatusBar,
  ScrollView,
  showErrorMessage,
  Text,
  View,
} from '@/components/ui';
import { getGovernorateLabel } from '@/lib/constants/governorates';
import { translate } from '@/lib/i18n';
import { api } from '../../../convex/_generated/api';

type DriverTrip = FunctionReturnType<
  typeof api.bookings.myTripsWithBookings
>[number];
type PassengerBooking = FunctionReturnType<
  typeof api.bookings.myBookingsAsPassenger
>[number];
type BookingStatus = PassengerBooking['status'];
type MyRequest = FunctionReturnType<
  typeof api.requests.myRideRequests
>[number];

function formatDepart(ms: number): string {
  const locale = i18n.language || 'en';
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(ms));
  }
  catch {
    return new Date(ms).toLocaleString();
  }
}

export function ActivityScreen() {
  const driverTrips = useQuery(api.bookings.myTripsWithBookings);
  const myBookings = useQuery(api.bookings.myBookingsAsPassenger);
  const myRequests = useQuery(api.requests.myRideRequests);

  if (
    driverTrips === undefined
    || myBookings === undefined
    || myRequests === undefined
  ) {
    return (
      <>
        <FocusAwareStatusBar />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </>
    );
  }

  return (
    <>
      <FocusAwareStatusBar />
      <ScrollView>
        <View className="flex-1 gap-6 p-4">
          <View className="gap-3">
            <Text className="text-xl font-bold">
              {translate('trips.activity.as_driver')}
            </Text>
            {driverTrips.length === 0
              ? (
                  <Text className="text-gray-500">
                    {translate('trips.activity.empty_driver')}
                  </Text>
                )
              : (
                  driverTrips.map(item => (
                    <DriverTripCard key={item.trip._id} item={item} />
                  ))
                )}
          </View>

          <View className="gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-700">
            <Text className="text-xl font-bold">
              {translate('trips.activity.as_passenger')}
            </Text>
            {myBookings.length === 0
              ? (
                  <Text className="text-gray-500">
                    {translate('trips.activity.empty_passenger')}
                  </Text>
                )
              : (
                  myBookings.map(booking => (
                    <PassengerBookingCard key={booking._id} booking={booking} />
                  ))
                )}
          </View>

          <View className="gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-700">
            <Text className="text-xl font-bold">
              {translate('trips.myRequests.title')}
            </Text>
            {myRequests.length === 0
              ? (
                  <Text className="text-gray-500">
                    {translate('trips.myRequests.empty')}
                  </Text>
                )
              : (
                  myRequests.map(request => (
                    <MyRequestRow key={request._id} request={request} />
                  ))
                )}
          </View>
        </View>
      </ScrollView>
    </>
  );
}

function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <View className="self-start rounded-full bg-neutral-200 px-2 py-0.5 dark:bg-neutral-700">
      <Text className="text-xs">
        {translate(`trips.booking_status.${status}`)}
      </Text>
    </View>
  );
}

function DriverTripCard({ item }: { item: DriverTrip }) {
  const { trip, bookings } = item;
  const router = useRouter();
  const approveBooking = useMutation(api.bookings.approveBooking);
  const rejectBooking = useMutation(api.bookings.rejectBooking);
  const cancelBooking = useMutation(api.bookings.cancelBooking);
  const completeTrip = useMutation(api.trips.completeTrip);

  const isActive = trip.status === 'open' || trip.status === 'full';

  return (
    <View className="gap-2 rounded-xl border border-neutral-300 p-4 dark:border-neutral-700">
      <Text className="text-lg font-semibold">
        {getGovernorateLabel(trip.originGov)}
        {' → '}
        {getGovernorateLabel(trip.destGov)}
      </Text>
      <Text className="text-gray-600 dark:text-neutral-400">
        {formatDepart(trip.departAt)}
      </Text>
      <View className="flex-row items-center justify-between">
        <Text className="text-gray-600 dark:text-neutral-400">
          {translate('trips.card.seats', {
            available: trip.seatsAvailable,
            total: trip.seatsTotal,
          })}
        </Text>
        <View className="self-start rounded-full bg-neutral-200 px-2 py-0.5 dark:bg-neutral-700">
          <Text className="text-xs">
            {translate(`trips.status.${trip.status}`)}
          </Text>
        </View>
      </View>

      {isActive
        ? (
            <Button
              variant="outline"
              label={translate('trips.activity.complete')}
              onPress={() => runMutation(() => completeTrip({ tripId: trip._id }))}
            />
          )
        : null}

      <Text className="mt-1 font-semibold">
        {translate('trips.activity.passengers')}
      </Text>
      {bookings.length === 0
        ? (
            <Text className="text-gray-500">
              {translate('trips.activity.no_bookings')}
            </Text>
          )
        : (
            bookings.map(b => (
              <BookingRow
                key={b._id}
                booking={b}
                onApprove={() => approveBooking({ bookingId: b._id })}
                onReject={() => rejectBooking({ bookingId: b._id })}
                onCancel={() => cancelBooking({ bookingId: b._id })}
                onRate={() => router.push(`/rate/${b._id}`)}
              />
            ))
          )}
    </View>
  );
}

function BookingRow({
  booking,
  onApprove,
  onReject,
  onCancel,
  onRate,
}: {
  booking: DriverTrip['bookings'][number];
  onApprove: () => Promise<null>;
  onReject: () => Promise<null>;
  onCancel: () => Promise<null>;
  onRate: () => void;
}) {
  return (
    <View className="gap-2 border-t border-neutral-200 pt-2 dark:border-neutral-700">
      <View className="flex-row items-center justify-between">
        <Text className="text-base">
          {booking.passengerName ?? translate('trips.card.driver_unknown')}
        </Text>
        <StatusBadge status={booking.status} />
      </View>
      <Text className="text-gray-600 dark:text-neutral-400">
        {translate('trips.activity.seats_booked', { seats: booking.seats })}
      </Text>
      {booking.status === 'pending'
        ? (
            <View className="flex-row gap-2">
              <Button
                label={translate('trips.activity.approve')}
                onPress={() => runMutation(onApprove)}
              />
              <Button
                variant="destructive"
                label={translate('trips.activity.reject')}
                onPress={() => runMutation(onReject)}
              />
            </View>
          )
        : null}
      {booking.status === 'confirmed'
        ? (
            <>
              <Text className="text-base">
                {`${translate('trips.activity.phone')}: ${booking.passengerPhone ?? '-'}`}
              </Text>
              <Button
                variant="outline"
                label={translate('trips.activity.cancel')}
                onPress={() => runMutation(onCancel)}
              />
            </>
          )
        : null}
      {booking.status === 'completed'
        ? (
            <Button
              label={translate('trips.activity.rate_passenger')}
              onPress={onRate}
            />
          )
        : null}
    </View>
  );
}

function PassengerBookingCard({ booking }: { booking: PassengerBooking }) {
  const router = useRouter();
  const cancelBooking = useMutation(api.bookings.cancelBooking);
  const trip = booking.trip;

  return (
    <View className="gap-2 rounded-xl border border-neutral-300 p-4 dark:border-neutral-700">
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-semibold">
          {trip
            ? `${getGovernorateLabel(trip.originGov)} → ${getGovernorateLabel(trip.destGov)}`
            : '-'}
        </Text>
        <StatusBadge status={booking.status} />
      </View>
      {trip
        ? (
            <>
              <Text className="text-gray-600 dark:text-neutral-400">
                {formatDepart(trip.departAt)}
              </Text>
              <Text className="font-semibold text-primary-600">
                {translate('trips.card.price', { price: trip.pricePerSeat })}
              </Text>
            </>
          )
        : null}
      {booking.status === 'confirmed'
        ? (
            <Text className="text-base">
              {`${translate('trips.activity.phone')}: ${booking.driverPhone ?? '-'}`}
            </Text>
          )
        : null}
      {booking.status === 'pending' || booking.status === 'confirmed'
        ? (
            <Button
              variant="outline"
              label={translate('trips.activity.cancel')}
              onPress={() =>
                runMutation(() => cancelBooking({ bookingId: booking._id }))}
            />
          )
        : null}
      {booking.status === 'completed'
        ? (
            <Button
              label={translate('trips.activity.rate_driver')}
              onPress={() => router.push(`/rate/${booking._id}`)}
            />
          )
        : null}
    </View>
  );
}

function MyRequestRow({ request }: { request: MyRequest }) {
  const cancelRideRequest = useMutation(api.requests.cancelRideRequest);

  return (
    <View className="gap-2 rounded-xl border border-neutral-300 p-4 dark:border-neutral-700">
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-semibold">
          {`${getGovernorateLabel(request.originGov)} → ${getGovernorateLabel(request.destGov)}`}
        </Text>
        <View className="self-start rounded-full bg-neutral-200 px-2 py-0.5 dark:bg-neutral-700">
          <Text className="text-xs">
            {translate(`trips.request_status.${request.status}`)}
          </Text>
        </View>
      </View>
      <Text className="text-gray-600 dark:text-neutral-400">
        {formatDepart(request.desiredAt)}
      </Text>
      <Text className="text-gray-600 dark:text-neutral-400">
        {translate('trips.activity.seats_booked', { seats: request.seats })}
      </Text>
      {request.status === 'open'
        ? (
            <Button
              variant="outline"
              label={translate('trips.activity.cancel')}
              onPress={() =>
                runMutation(() => cancelRideRequest({ requestId: request._id }))}
            />
          )
        : null}
    </View>
  );
}

async function runMutation(fn: () => Promise<null>): Promise<void> {
  try {
    await fn();
  }
  catch {
    showErrorMessage(translate('trips.book.error'));
  }
}
