import random
import uuid
from datetime import timedelta, datetime
from dateutil.relativedelta import relativedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from transactions.services import generate_demo_data

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds realistic transaction data for a specific user over N months'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, required=True, help='User email to attach transactions to')
        parser.add_argument('--months', type=int, default=6, help='Number of months of history to generate')

    def handle(self, *args, **options):
        email = options['email']
        months = options['months']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'User with email {email} does not exist. Please create one first.'))
            return

        count = generate_demo_data(user.id, months=months)

        if count > 0:
            self.stdout.write(self.style.SUCCESS(f'Successfully seeded {count} transactions for user {email} (Total months: {months}).'))
        else:
            self.stdout.write(self.style.WARNING('No transactions generated.'))
