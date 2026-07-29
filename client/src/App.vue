<template>
  <div class="app-layout" :data-theme="theme">
    <AppSidebar />
    <div class="main-area">
      <AppHeader />
      <main class="page-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>
