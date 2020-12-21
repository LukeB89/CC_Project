"""cc_proj URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/2.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
# generic django template
from django.urls import path
from . import views
# paths from frontend and corresponding link to backend
urlpatterns = [
    path('', views.index, name='index'),
    path('get_events',views.get_events, name='events'),
    path('get_groups',views.get_groups, name='groups'),
    path('user_update', views.update_user, name='user_update'),
    path('events_update', views.update_events, name='events_update')
]

